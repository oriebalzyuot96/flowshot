const SENSITIVE_KEY =
  /authorization|cookie|token|password|secret|api[-_]?key|session|credential|passwd|set-cookie/i

const SECRET_VALUE =
  /^(?:bearer\s+)?[A-Za-z0-9._~+/-]{24,}$/i

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key) || key === '__proto__' || key === 'constructor' || key === 'prototype'
}

export function redact(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    if (isSensitiveKey(key) || looksSecret(value)) return '[redacted]'
    return value.length > 180 ? `${value.slice(0, 180)}…` : value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
    return value
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [childKey, child] of Object.entries(value)) {
      if (childKey === '__proto__' || childKey === 'constructor' || childKey === 'prototype') continue
      out[childKey] = redact(child, childKey)
    }
    return out
  }
  return null
}

export function looksSecret(value: string): boolean {
  const trimmed = value.trim()
  if (/^bearer\s+\S+/i.test(trimmed)) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true
  if (trimmed.length >= 24 && SECRET_VALUE.test(trimmed) && /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed)) {
    return true
  }
  return false
}
