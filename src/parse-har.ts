import { isSensitiveKey, redact } from './redact.js'
import type { Call, QueryParam } from './types.js'

const STATIC_EXT = /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm)$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type HarHeader = { name?: string; value?: string }
type HarContent = { text?: string; encoding?: string; mimeType?: string; size?: number }
type HarEntry = {
  startedDateTime?: string
  time?: number
  _resourceType?: string
  request?: {
    method?: string
    url?: string
    headers?: HarHeader[]
    queryString?: HarHeader[]
    postData?: { mimeType?: string; text?: string; params?: HarHeader[] }
  }
  response?: {
    status?: number
    content?: HarContent
  }
}

export type ParsedHar = {
  calls: Call[]
  ignoredCount: number
}

export function parseHar(raw: unknown): ParsedHar {
  const entries = entriesOf(raw)
  const indexed = entries.map((entry, index) => ({ entry, index }))
  indexed.sort((left, right) => {
    const byTime = (left.entry.startedDateTime ?? '').localeCompare(right.entry.startedDateTime ?? '')
    return byTime || left.index - right.index
  })

  const calls: Call[] = []
  let ignoredCount = 0
  for (const { entry } of indexed) {
    const call = toCall(entry)
    if (call) calls.push(call)
    else ignoredCount += 1
  }
  return { calls, ignoredCount }
}

function entriesOf(raw: unknown): HarEntry[] {
  if (!raw || typeof raw !== 'object') {
    throw new Error('HAR is missing log.entries. Export "Save all as HAR with content".')
  }
  const record = raw as { log?: { entries?: unknown }; entries?: unknown }
  const entries = record.log?.entries ?? record.entries
  if (!Array.isArray(entries)) {
    throw new Error('HAR is missing log.entries. Export "Save all as HAR with content".')
  }
  return entries as HarEntry[]
}

function toCall(entry: HarEntry): Call | null {
  const request = entry.request
  const urlText = request?.url
  if (!request || !urlText) return null
  let url: URL
  try {
    url = new URL(urlText)
  } catch {
    return null
  }

  const method = (request.method ?? 'GET').toUpperCase()
  if (method === 'OPTIONS' || method === 'HEAD') return null
  const resource = (entry._resourceType ?? '').toLowerCase()
  const requestMime = request.postData?.mimeType ?? ''
  const responseMime = entry.response?.content?.mimeType ?? ''
  const apiLike =
    resource === 'xhr' ||
    resource === 'fetch' ||
    responseMime.includes('json') ||
    requestMime.includes('json') ||
    url.pathname.includes('/api/')
  if (!apiLike) return null
  if (STATIC_EXT.test(url.pathname) && resource !== 'xhr' && resource !== 'fetch') return null

  const requestBody = readRequestBody(request.postData)
  const responseBody = readContent(entry.response?.content)
  return {
    startedAt: entry.startedDateTime ?? '',
    timeMs: Math.round(entry.time ?? 0),
    method,
    origin: url.origin,
    path: url.pathname,
    displayPath: displayPath(url.pathname),
    query: queryOf(request.queryString),
    requestJson: requestBody,
    status: entry.response?.status ?? 0,
    responseJson: responseBody.json,
    bodyMissing: responseBody.missing,
  }
}

function queryOf(pairs: HarHeader[] | undefined): QueryParam[] {
  if (!pairs) return []
  return pairs
    .filter((pair) => pair.name && !isSensitiveKey(pair.name))
    .map((pair) => {
      const value = pair.value ?? ''
      const redacted = redact(value, pair.name ?? '')
      return { name: pair.name!, value: typeof redacted === 'string' ? redacted : '' }
    })
    .filter((pair) => pair.value !== '[redacted]')
}

function readRequestBody(post: { mimeType?: string; text?: string; params?: HarHeader[] } | undefined): unknown {
  if (!post) return undefined
  if (typeof post.text === 'string' && post.text.length > 0) {
    const parsed = parseJson(post.text, post.mimeType ?? '')
    return parsed === undefined ? undefined : redact(parsed)
  }
  if (post.params && post.params.length > 0) {
    const record: Record<string, string> = {}
    for (const param of post.params) {
      if (!param.name || isSensitiveKey(param.name)) continue
      const redacted = redact(param.value ?? '', param.name)
      if (typeof redacted === 'string' && redacted !== '[redacted]') record[param.name] = redacted
    }
    return record
  }
  return undefined
}

function readContent(content: HarContent | undefined): { json: unknown; missing: boolean } {
  if (!content?.text) return { json: undefined, missing: true }
  const text = content.encoding === 'base64' ? Buffer.from(content.text, 'base64').toString('utf8') : content.text
  const parsed = parseJson(text, content.mimeType ?? '')
  if (parsed === undefined) return { json: undefined, missing: false }
  return { json: redact(parsed), missing: false }
}

function parseJson(text: string, mime: string): unknown {
  const trimmed = text.trim()
  const jsonLike = mime.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')
  if (!jsonLike) return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return undefined
  }
}

function displayPath(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => (/^\d+$/.test(segment) || UUID.test(segment) ? '{id}' : segment))
    .join('/')
}
