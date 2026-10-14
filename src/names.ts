const RESERVED = new Set([
  'arguments', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'error', 'eval', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface',
  'items', 'let', 'loading', 'new', 'null', 'of', 'onSubmit', 'package', 'private', 'protected',
  'public', 'result', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield',
])

export function toPascal(input: string): string {
  const parts = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const pascal = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  if (!pascal) return 'CapturedFlow'
  return /^[0-9]/.test(pascal) ? `Flow${pascal}` : pascal
}

export function toKebab(pascal: string): string {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function toIdent(input: string, used: Set<string>): string {
  const pascal = toPascal(input)
  let ident = pascal.charAt(0).toLowerCase() + pascal.slice(1)
  if (!ident || RESERVED.has(ident)) ident = `${ident || 'field'}Value`
  const base = ident
  let suffix = 2
  while (used.has(ident)) {
    ident = `${base}${suffix}`
    suffix += 1
  }
  used.add(ident)
  return ident
}

export function callFunctionName(method: string, displayPath: string, used: Set<string>): string {
  const segments = displayPath.split('/').filter(Boolean)
  let byId = false
  const words: string[] = []
  for (const segment of segments) {
    if (segment.startsWith('{')) {
      byId = true
      continue
    }
    words.push(segment)
  }
  const resource = toPascal(words[words.length - 1] ?? 'root')
  const base = `${method.toLowerCase()}${resource}${byId ? 'ById' : ''}`
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let suffix = 2
  while (used.has(`${base}${suffix}`)) suffix += 1
  const name = `${base}${suffix}`
  used.add(name)
  return name
}
