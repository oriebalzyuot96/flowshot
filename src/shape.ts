import type { FieldShape, Shape } from './types.js'

export function shapeOf(value: unknown): Shape {
  if (value === null) return { kind: 'null' }
  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: 'array', item: { kind: 'unknown' } }
    return { kind: 'array', item: value.map((item) => shapeOf(item)).reduce(mergeShapes) }
  }
  switch (typeof value) {
    case 'string':
      return { kind: 'string' }
    case 'number':
      return { kind: 'number' }
    case 'boolean':
      return { kind: 'boolean' }
    case 'object':
      return { kind: 'object', fields: fieldsOf(value as Record<string, unknown>, false) }
    default:
      return { kind: 'unknown' }
  }
}

export function mergeShapes(left: Shape, right: Shape): Shape {
  if (left.kind === 'array' && right.kind === 'array') {
    return { kind: 'array', item: mergeShapes(left.item, right.item) }
  }
  if (left.kind === 'object' && right.kind === 'object') {
    const names = uniqueNames(left.fields, right.fields)
    return {
      kind: 'object',
      fields: names.map((name) => {
        const leftField = left.fields.find((field) => field.name === name)
        const rightField = right.fields.find((field) => field.name === name)
        if (leftField && rightField) {
          return {
            name,
            shape: mergeShapes(leftField.shape, rightField.shape),
            optional: leftField.optional || rightField.optional,
          }
        }
        const only = leftField ?? rightField
        return { name, shape: only!.shape, optional: true }
      }),
    }
  }
  if (left.kind === right.kind) return left
  return { kind: 'unknown' }
}

export function shapeToTs(shape: Shape): string {
  switch (shape.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'unknown':
      return shape.kind
    case 'null':
      return 'null'
    case 'array': {
      const item = shapeToTs(shape.item)
      return item.endsWith('[]') ? `Array<${item}>` : `${item}[]`
    }
    case 'object':
      if (shape.fields.length === 0) return 'Record<string, never>'
      return `{ ${shape.fields.map((field) => `${safeKey(field.name)}${field.optional ? '?' : ''}: ${shapeToTs(field.shape)}`).join('; ')} }`
  }
}

export function findListPath(value: unknown, prefix: string[] = [], depth = 0): string[] | null {
  if (Array.isArray(value) && value.some((item) => item !== null && typeof item === 'object')) return prefix
  if (depth >= 4 || value === null || typeof value !== 'object' || Array.isArray(value)) return null
  for (const [key, child] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    const found = findListPath(child, [...prefix, key], depth + 1)
    if (found) return found
  }
  return null
}

export function valueAt(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

function fieldsOf(value: Record<string, unknown>, optional: boolean): FieldShape[] {
  return Object.entries(value)
    .filter(([key]) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype')
    .map(([name, child]) => ({ name, shape: shapeOf(child), optional }))
}

function uniqueNames(left: FieldShape[], right: FieldShape[]): string[] {
  const names: string[] = []
  for (const field of [...left, ...right]) {
    if (!names.includes(field.name)) names.push(field.name)
  }
  return names
}

function safeKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name)
}
