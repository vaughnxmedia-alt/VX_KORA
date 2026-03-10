export function safeStringify(obj: unknown, indent?: number): string {
  try {
    return JSON.stringify(obj, safeReplacer, indent)
  } catch (e) {
    return "{}"
  }
}

function safeReplacer(key: string, value: unknown): unknown {
  if (value === undefined) {
    return null
  }

  if (typeof value === "number" && isNaN(value)) {
    return null
  }

  if (typeof value === "number" && !isFinite(value)) {
    return null
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (typeof value === "function") {
    return undefined
  }

  if (typeof value === "symbol") {
    return value.toString()
  }

  return value
}

export function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (e) {
    return fallback
  }
}

export function ensureString(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    if (value === "[object Object]") return ""
    if (value === "undefined") return ""
    if (value === "null") return ""
    if (value === "NaN") return ""
    return value
  }

  if (typeof value === "number") {
    if (isNaN(value)) return ""
    return String(value)
  }

  if (typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(ensureString).filter(v => v.length > 0).join(", ")
  }

  if (typeof value === "object") {
    const str = JSON.stringify(value)
    if (str === "{}") return ""
    return str
  }

  return String(value)
}

export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (value === null || value === undefined) {
    return []
  }

  return [value as T]
}

export function ensureNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

export function ensureBoolean(value: unknown, fallback: boolean = false): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase()
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false
    }
  }

  if (typeof value === "number") {
    return value !== 0
  }

  return fallback
}

export function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = ""
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value === null || value === undefined) {
      result[newKey] = null
      continue
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[newKey] = value
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(result, flattenObject(item as Record<string, unknown>, `${newKey}[${index}]`))
        } else {
          result[`${newKey}[${index}]`] = item as string | number | boolean | null
        }
      })
      continue
    }

    if (typeof value === "object") {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
      continue
    }
  }

  return result
}

export function unflattenObject(
  flat: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current: Record<string, unknown> = result

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const nextPart = parts[i + 1]
      const isNextArray = /^\d+$/.test(nextPart)

      if (!(part in current)) {
        current[part] = isNextArray ? [] : {}
      }

      current = current[part] as Record<string, unknown>
    }

    const lastPart = parts[parts.length - 1]
    current[lastPart] = value
  }

  return result
}

export function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (value === null) continue
    if (typeof value === "string" && value.trim() === "") continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === "object" && Object.keys(value).length === 0) continue

    if (typeof value === "string") {
      const cleaned = cleanString(value)
      if (cleaned) result[key] = cleaned
    } else if (Array.isArray(value)) {
      const cleaned = value
        .map(item => typeof item === "string" ? cleanString(item) : item)
        .filter(item => item !== null && item !== undefined && item !== "")
      if (cleaned.length > 0) result[key] = cleaned
    } else if (typeof value === "object") {
      const cleaned = cleanObject(value as Record<string, unknown>)
      if (Object.keys(cleaned).length > 0) result[key] = cleaned
    } else {
      result[key] = value
    }
  }

  return result as T
}

function cleanString(value: string): string | null {
  if (value === "[object Object]") return null
  if (value === "undefined") return null
  if (value === "null") return null
  if (value === "NaN") return null
  
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
