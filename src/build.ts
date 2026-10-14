import fs from 'node:fs'
import path from 'node:path'
import { emitFlow } from './emit.js'
import { inferFlow } from './infer.js'
import { parseHar } from './parse-har.js'
import type { BuildResult, Framework } from './types.js'

export type BuildOptions = {
  harPath: string
  outDir: string
  name?: string
  framework?: string
}

export function buildFlow(options: BuildOptions): BuildResult {
  if (!fs.existsSync(options.harPath)) throw new Error(`HAR not found: ${options.harPath}`)
  const framework = parseFramework(options.framework)
  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(options.harPath, 'utf8')) as unknown
  } catch {
    throw new Error(`Could not read HAR JSON: ${options.harPath}`)
  }
  const parsed = parseHar(raw)
  if (parsed.calls.length === 0) {
    throw new Error('No application calls found. Export a HAR with content while you perform the one action you want to rebuild.')
  }
  const flow = inferFlow(parsed.calls, options.name, framework, parsed.ignoredCount)
  const files = emitFlow(flow, options.outDir)
  return {
    outDir: path.resolve(options.outDir),
    files,
    flow,
    evidenceMarkdown: fs.readFileSync(path.join(options.outDir, 'evidence.md'), 'utf8'),
  }
}

function parseFramework(value: string | undefined): Framework {
  if (value === undefined || value === 'react') return 'react'
  if (value === 'angular') return 'angular'
  throw new Error('framework must be react or angular')
}
