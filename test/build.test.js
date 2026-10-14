import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildFlow, handleMessage } from '../dist/index.js'

const harPath = path.resolve('examples/notes-search.har')

test('a notes search HAR becomes a React component without copied secrets', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowshot-'))
  const built = buildFlow({ harPath, outDir, name: 'NotesSearch', framework: 'react' })
  const combined = built.files.map((file) => fs.readFileSync(path.join(outDir, file), 'utf8')).join('\n')

  assert.equal(combined.includes('super-secret-token-do-not-leak'), false)
  assert.equal(combined.includes('super-secret-session'), false)
  assert.ok(built.evidenceMarkdown.includes('GET | `/api/notes`'))
  assert.doesNotMatch(built.evidenceMarkdown, /app\.js/)
  assert.equal(built.flow.ignoredCount, 1)
  assert.match(fs.readFileSync(path.join(outDir, 'api.ts'), 'utf8'), /export async function getNotes/)
  assert.match(fs.readFileSync(path.join(outDir, 'api.ts'), 'utf8'), /updatedAt\?: string/)
  assert.match(fs.readFileSync(path.join(outDir, 'NotesSearch.tsx'), 'utf8'), /export function NotesSearch/)
  assert.match(fs.readFileSync(path.join(outDir, 'NotesSearch.tsx'), 'utf8'), /setItems\(loaded\.items \?\? \[\]\)/)
})

test('Angular output drops a password from the request body', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowshot-'))
  const postHar = path.join(dir, 'post.har')
  fs.writeFileSync(postHar, JSON.stringify({
    log: {
      entries: [{
        startedDateTime: '2026-10-15T00:00:02.000Z',
        time: 40,
        _resourceType: 'fetch',
        request: {
          method: 'POST',
          url: 'https://notes.example/api/notes',
          headers: [],
          postData: {
            mimeType: 'application/json',
            text: JSON.stringify({ title: 'Design notes', password: 'hunter2-should-not-leak' }),
          },
        },
        response: {
          status: 201,
          content: {
            mimeType: 'application/json',
            text: JSON.stringify({ id: 9, title: 'Design notes' }),
          },
        },
      }],
    },
  }))

  const outDir = path.join(dir, 'out')
  const built = buildFlow({ harPath: postHar, outDir, name: 'CreateNote', framework: 'angular' })
  const combined = built.files.map((file) => fs.readFileSync(path.join(outDir, file), 'utf8')).join('\n')
  assert.equal(combined.includes('hunter2-should-not-leak'), false)
  assert.match(fs.readFileSync(path.join(outDir, 'create-note.component.ts'), 'utf8'), /selector: 'app-create-note'/)
  assert.match(combined, /this\.resultText =/)
})

test('an unknown framework is rejected', () => {
  assert.throws(
    () => buildFlow({ harPath, outDir: os.tmpdir(), framework: 'vue' }),
    /react or angular/,
  )
})

test('the MCP tool list and call write the same evidence', () => {
  const listed = handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  assert.equal(listed.result.tools[0].name, 'build_flow_from_har')

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowshot-mcp-'))
  const called = handleMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'build_flow_from_har',
      arguments: { harPath, outDir, name: 'NotesSearch' },
    },
  })
  assert.match(called.result.content[0].text, /evidence\.md/)
  assert.equal(fs.existsSync(path.join(outDir, 'NotesSearch.tsx')), true)
})
