#!/usr/bin/env node
import { buildFlow } from './build.js'
import { serveMcp } from './mcp.js'

const HELP = `Flowshot turns one HAR capture into a component and the evidence behind it.

Usage
  flowshot build <file.har> [--out dir] [--name Name] [--framework react|angular|svelte|astro]
  flowshot mcp

The HAR has to be one you exported yourself, with response content
("Save all as HAR with content"). Cookies and authorization headers are dropped.
`

function main(): void {
  const [command, ...rest] = process.argv.slice(2)
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(HELP)
    process.exit(command ? 0 : 1)
  }
  if (command === 'mcp') {
    serveMcp()
    return
  }
  if (command !== 'build') {
    process.stderr.write(`Unknown command: ${command}\n\n${HELP}`)
    process.exit(1)
  }
  const { positionals, flags } = parseArgs(rest)
  const harPath = positionals[0]
  if (!harPath) {
    process.stderr.write(`Missing HAR path.\n\n${HELP}`)
    process.exit(1)
  }
  try {
    const built = buildFlow({
      harPath,
      outDir: flagString(flags, 'out') ?? 'flowshot-out',
      name: flagString(flags, 'name'),
      framework: flagString(flags, 'framework'),
    })
    process.stdout.write(`Wrote ${built.files.length} files to ${built.outDir}\n`)
    for (const file of built.files) process.stdout.write(`  ${file}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Flowshot failed'}\n`)
    process.exit(1)
  }
}

function parseArgs(args: string[]): { positionals: string[]; flags: Map<string, string | true> } {
  const positionals: string[] = []
  const flags = new Map<string, string | true>()
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (!arg.startsWith('--')) {
      positionals.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = args[index + 1]
    if (!next || next.startsWith('--')) flags.set(key, true)
    else {
      flags.set(key, next)
      index += 1
    }
  }
  return { positionals, flags }
}

function flagString(flags: Map<string, string | true>, key: string): string | undefined {
  const value = flags.get(key)
  return typeof value === 'string' ? value : undefined
}

main()
