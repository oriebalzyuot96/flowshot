import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 4177)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')
const origin = `http://127.0.0.1:${port}`

const products = [
  { id: 1, title: 'Brass desk lamp', price: 48, updatedAt: '2026-10-01' },
  { id: 2, title: 'Clip lamp', price: 19 },
  { id: 3, title: 'Oak stool', price: 90, updatedAt: '2026-09-12' },
  { id: 4, title: 'Ceramic cup', price: 14, updatedAt: '2026-08-02' },
]

const recorded = []

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', origin)
  if (request.method === 'GET' && url.pathname === '/api/products') {
    const started = Date.now()
    const body = JSON.stringify({ items: search(url.searchParams.get('q') ?? '') })
    recorded.push(apiEntry(request, url, body, Date.now() - started))
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    response.end(body)
    return
  }

  if (request.method === 'GET' && url.pathname === '/__sample-har') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ log: { version: '1.2', creator: { name: 'shelf-sample', version: '1' }, entries: recorded } }))
    return
  }

  const filePath = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  const ext = path.extname(filePath)
  const text = fs.readFileSync(filePath)
  if (ext === '.js') recorded.push(scriptEntry(url.pathname))
  const headers = { 'content-type': types[ext] ?? 'application/octet-stream' }
  if (ext === '.html') headers['set-cookie'] = 'shelf=sample-session-do-not-copy; Path=/; HttpOnly'
  response.writeHead(200, headers)
  response.end(text)
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Shelf sample at ${origin}\n`)
})

function search(raw) {
  const query = raw.trim().toLowerCase()
  return products.filter((product) => !query || product.title.toLowerCase().includes(query))
}

function apiEntry(request, url, body, timeMs) {
  const headers = []
  const cookie = request.headers.cookie
  if (cookie) headers.push({ name: 'Cookie', value: cookie })
  return {
    startedDateTime: new Date().toISOString(),
    time: timeMs,
    _resourceType: 'xhr',
    request: {
      method: 'GET',
      url: `${origin}${url.pathname}${url.search}`,
      headers,
      queryString: [...url.searchParams].map(([name, value]) => ({ name, value })),
    },
    response: {
      status: 200,
      content: { mimeType: 'application/json', text: body },
    },
  }
}

function scriptEntry(pathname) {
  return {
    startedDateTime: new Date().toISOString(),
    time: 4,
    _resourceType: 'script',
    request: {
      method: 'GET',
      url: `${origin}${pathname}`,
      headers: [],
    },
    response: {
      status: 200,
      content: { mimeType: 'text/javascript', text: '/* static */' },
    },
  }
}
