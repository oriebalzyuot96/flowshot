import { callFunctionName, toIdent, toKebab, toPascal } from './names.js'
import { isSensitiveKey } from './redact.js'
import { findListPath, shapeOf } from './shape.js'
import type { Call, FlowModel, FormField, Framework, NamedCall } from './types.js'

export function inferFlow(calls: Call[], nameInput: string | undefined, framework: Framework, ignoredCount: number): FlowModel {
  const name = toPascal(nameInput ?? defaultName(calls))
  const usedFunctions = new Set<string>()
  const usedIdents = new Set<string>()
  const formFields: FormField[] = []

  const named: NamedCall[] = calls.map((call, callIndex) => {
    const inputFields = fieldsForCall(call, callIndex, usedIdents)
    formFields.push(...inputFields)
    return {
      ...call,
      functionName: callFunctionName(call.method, call.displayPath, usedFunctions),
      inputFields,
    }
  })

  const resultCallIndex = chooseResult(named)
  const result = named[resultCallIndex]
  const listPath = result?.responseJson === undefined ? [] : findListPath(result.responseJson) ?? []

  return {
    name,
    kebab: toKebab(name),
    framework,
    calls: named,
    formFields,
    resultCallIndex,
    listPath,
    ignoredCount,
  }
}

function defaultName(calls: Call[]): string {
  const path = calls[0]?.displayPath ?? ''
  const segment = [...path.split('/')].reverse().find((part) => part && !part.startsWith('{'))
  return segment ? `${segment} flow` : 'Captured flow'
}

function fieldsForCall(call: Call, callIndex: number, used: Set<string>): FormField[] {
  const fields: FormField[] = []
  if (call.displayPath.includes('{id}')) {
    fields.push(field('id', 'path', callIndex, '', 'string', used))
  }
  for (const query of call.query) {
    if (isSensitiveKey(query.name)) continue
    fields.push(field(query.name, 'query', callIndex, query.value, 'string', used))
  }
  if (call.requestJson && typeof call.requestJson === 'object' && !Array.isArray(call.requestJson)) {
    for (const [key, value] of Object.entries(call.requestJson)) {
      if (isSensitiveKey(key) || value === '[redacted]') continue
      const kind = valueKind(value)
      if (!kind) continue
      fields.push(field(key, 'body', callIndex, primitiveText(value), kind, used))
    }
  }
  return fields
}

function field(
  name: string,
  source: FormField['source'],
  callIndex: number,
  example: string,
  valueKindName: FormField['valueKind'],
  used: Set<string>,
): FormField {
  return {
    name,
    ident: toIdent(name, used),
    label: name,
    source,
    callIndex,
    example,
    valueKind: valueKindName,
  }
}

function valueKind(value: unknown): FormField['valueKind'] | null {
  const shape = shapeOf(value)
  if (shape.kind === 'string' || shape.kind === 'number' || shape.kind === 'boolean') return shape.kind
  return null
}

function primitiveText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function chooseResult(calls: NamedCall[]): number {
  let lastJson = -1
  let lastList = -1
  calls.forEach((call, index) => {
    if (call.status >= 400 || call.responseJson === undefined) return
    lastJson = index
    if (findListPath(call.responseJson)) lastList = index
  })
  if (lastList >= 0) return lastList
  if (lastJson >= 0) return lastJson
  return Math.max(0, calls.length - 1)
}
