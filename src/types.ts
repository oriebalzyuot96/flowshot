export type Framework = 'react' | 'angular'

export type Shape =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'unknown' }
  | { kind: 'array'; item: Shape }
  | { kind: 'object'; fields: FieldShape[] }

export type FieldShape = {
  name: string
  shape: Shape
  optional: boolean
}

export type QueryParam = {
  name: string
  value: string
}

export type Call = {
  startedAt: string
  timeMs: number
  method: string
  origin: string
  path: string
  displayPath: string
  query: QueryParam[]
  requestJson: unknown
  status: number
  responseJson: unknown
  bodyMissing: boolean
}

export type FormField = {
  name: string
  ident: string
  label: string
  source: 'query' | 'body' | 'path'
  callIndex: number
  example: string
  valueKind: 'string' | 'number' | 'boolean'
}

export type NamedCall = Call & {
  functionName: string
  inputFields: FormField[]
}

export type FlowModel = {
  name: string
  kebab: string
  framework: Framework
  calls: NamedCall[]
  formFields: FormField[]
  resultCallIndex: number
  listPath: string[]
  ignoredCount: number
}

export type BuildResult = {
  outDir: string
  files: string[]
  flow: FlowModel
  evidenceMarkdown: string
}
