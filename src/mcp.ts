import { buildFlow } from './build.js'

type JsonRpc = {
  jsonrpc: '2.0'
  id?: number | string | null
  method?: string
  params?: {
    protocolVersion?: string
    name?: string
    arguments?: Record<string, unknown>
  }
  result?: unknown
  error?: { code: number; message: string }
}

const SERVER = { name: 'flowshot', version: '0.1.0' }

export function handleMessage(message: JsonRpc): JsonRpc | null {
  if (!message.method || message.method.startsWith('notifications/')) return null
  if (message.method === 'initialize') {
    const requested = message.params?.protocolVersion
    const protocolVersion = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : '2024-11-05'
    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      result: {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER,
      },
    }
  }
  if (message.method === 'ping') return { jsonrpc: '2.0', id: message.id ?? null, result: {} }
  if (message.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      result: { tools: [toolSchema()] },
    }
  }
  if (message.method === 'tools/call') {
    return callTool(message)
  }
  return {
    jsonrpc: '2.0',
    id: message.id ?? null,
    error: { code: -32601, message: `Unknown method: ${message.method}` },
  }
}

export function serveMcp(): void {
  let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0)
  process.stdin.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk])
    buffer = drain(buffer)
  })
  process.stdin.resume()
}

function callTool(message: JsonRpc): JsonRpc {
  const args = message.params?.arguments ?? {}
  const harPath = typeof args.harPath === 'string' ? args.harPath : ''
  const outDir = typeof args.outDir === 'string' ? args.outDir : ''
  if (!harPath || !outDir) {
    return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32602, message: 'harPath and outDir are required' } }
  }
  try {
    const built = buildFlow({
      harPath,
      outDir,
      name: typeof args.name === 'string' ? args.name : undefined,
      framework: typeof args.framework === 'string' ? args.framework : undefined,
    })
    const text = [
      `Wrote ${built.files.length} files to ${built.outDir}`,
      ...built.files.map((file) => `- ${file}`),
      '',
      built.evidenceMarkdown,
    ].join('\n')
    return { jsonrpc: '2.0', id: message.id ?? null, result: { content: [{ type: 'text', text }] } }
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Flowshot failed'
    return { jsonrpc: '2.0', id: message.id ?? null, result: { content: [{ type: 'text', text }], isError: true } }
  }
}

function toolSchema(): Record<string, unknown> {
  return {
    name: 'build_flow_from_har',
    description: 'Turn one HAR capture the user exported into a component plus evidence.md. Use only a capture the user is allowed to examine.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['harPath', 'outDir'],
      properties: {
        harPath: { type: 'string', description: 'Absolute path to a HAR file exported with response content.' },
        outDir: { type: 'string', description: 'Directory where evidence.md, flow.json, api.ts, and the component are written.' },
        name: { type: 'string', description: 'PascalCase component name, such as NotesSearch.' },
        framework: { type: 'string', enum: ['react', 'angular'] },
      },
    },
  }
}

function drain(buffer: Buffer<ArrayBufferLike>): Buffer<ArrayBufferLike> {
  let rest = buffer
  while (rest.length > 0) {
    const headerEnd = rest.indexOf('\r\n\r\n')
    if (headerEnd === -1) return rest
    const header = rest.subarray(0, headerEnd).toString('utf8')
    const match = /Content-Length:\s*(\d+)/i.exec(header)
    if (!match) {
      rest = rest.subarray(headerEnd + 4)
      continue
    }
    const length = Number(match[1])
    const start = headerEnd + 4
    if (rest.length < start + length) return rest
    const body = rest.subarray(start, start + length).toString('utf8')
    rest = rest.subarray(start + length)
    try {
      const response = handleMessage(JSON.parse(body) as JsonRpc)
      if (response) writeMessage(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid MCP message'
      writeMessage({ jsonrpc: '2.0', id: null, error: { code: -32700, message } })
    }
  }
  return rest
}

function writeMessage(message: unknown): void {
  const payload = Buffer.from(JSON.stringify(message), 'utf8')
  process.stdout.write(`Content-Length: ${payload.length}\r\n\r\n`)
  process.stdout.write(payload)
}
