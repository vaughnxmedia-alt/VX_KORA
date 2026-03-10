export interface ValidationError {
  path: string
  message: string
  value: unknown
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  cleaned: Record<string, unknown>
}

export function validateDeliverable(
  data: Record<string, unknown>,
  type: "brand_blueprint" | "content_strategy" | "audience_analysis"
): ValidationResult {
  const errors: ValidationError[] = []
  const cleaned = deepClean(data)

  switch (type) {
    case "brand_blueprint":
      validateBrandBlueprint(cleaned, errors)
      break
    case "content_strategy":
      validateContentStrategy(cleaned, errors)
      break
    case "audience_analysis":
      validateAudienceAnalysis(cleaned, errors)
      break
  }

  return {
    valid: errors.length === 0,
    errors,
    cleaned,
  }
}

function validateBrandBlueprint(
  data: Record<string, unknown>,
  errors: ValidationError[]
): void {
  validateString(data, "brandEssence", errors, { optional: true })
  validateString(data, "missionStatement", errors, { optional: true, minLength: 10 })
  validateString(data, "visionStatement", errors, { optional: true })
  validateString(data, "uniqueValueProposition", errors, { optional: true, minLength: 15 })
  validateString(data, "positioningStatement", errors, { optional: true })
  validateString(data, "brandStory", errors, { optional: true })
  
  validateArray(data, "coreValues", errors, (item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ path: `coreValues[${index}]`, message: "Must be an object", value: item })
      return
    }
    validateString(item as Record<string, unknown>, "value", errors, { path: `coreValues[${index}].value` })
  })

  validateArray(data, "brandPersonality", errors, (item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ path: `brandPersonality[${index}]`, message: "Must be an object", value: item })
      return
    }
    validateString(item as Record<string, unknown>, "trait", errors, { path: `brandPersonality[${index}].trait` })
  })

  if (data.brandVoice && typeof data.brandVoice === "object") {
    const bv = data.brandVoice as Record<string, unknown>
    validateString(bv, "tone", errors, { path: "brandVoice.tone", optional: true })
    validateString(bv, "languageStyle", errors, { path: "brandVoice.languageStyle", optional: true })
  }
}

function validateContentStrategy(
  data: Record<string, unknown>,
  errors: ValidationError[]
): void {
  validateArray(data, "contentPillars", errors, (item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ path: `contentPillars[${index}]`, message: "Must be an object", value: item })
      return
    }
    const pillar = item as Record<string, unknown>
    validateString(pillar, "name", errors, { path: `contentPillars[${index}].name` })
    validateString(pillar, "description", errors, { path: `contentPillars[${index}].description`, optional: true })
  })

  validateArray(data, "platformStrategy", errors, (item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ path: `platformStrategy[${index}]`, message: "Must be an object", value: item })
      return
    }
    const ps = item as Record<string, unknown>
    validateString(ps, "platform", errors, { path: `platformStrategy[${index}].platform` })
    validateString(ps, "focus", errors, { path: `platformStrategy[${index}].focus`, optional: true })
  })

  validateArray(data, "exampleWeek", errors, (item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ path: `exampleWeek[${index}]`, message: "Must be an object", value: item })
      return
    }
    const ew = item as Record<string, unknown>
    validateString(ew, "day", errors, { path: `exampleWeek[${index}].day` })
    validateString(ew, "topic", errors, { path: `exampleWeek[${index}].topic`, optional: true })
  })

  validateString(data, "growthStrategy", errors, { optional: true })
  validateArray(data, "keyTips", errors)
}

function validateAudienceAnalysis(
  data: Record<string, unknown>,
  errors: ValidationError[]
): void {
  validateString(data, "overview", errors, { optional: true })
  validateString(data, "audiencePsychology", errors, { optional: true })
  validateString(data, "audienceFlywheel", errors, { optional: true })

  if (data.primaryAudience && typeof data.primaryAudience === "object") {
    const pa = data.primaryAudience as Record<string, unknown>
    validateString(pa, "demographics", errors, { path: "primaryAudience.demographics", optional: true })
    validateString(pa, "psychographics", errors, { path: "primaryAudience.psychographics", optional: true })
  }

  validateArray(data, "audienceSegments", errors, (item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ path: `audienceSegments[${index}]`, message: "Must be an object", value: item })
      return
    }
    const seg = item as Record<string, unknown>
    validateString(seg, "name", errors, { path: `audienceSegments[${index}].name` })
    validateString(seg, "description", errors, { path: `audienceSegments[${index}].description`, optional: true })
  })

  validateArray(data, "audienceMotivations", errors)
  validateArray(data, "engagementTriggers", errors)
}

interface ValidateStringOptions {
  path?: string
  optional?: boolean
  minLength?: number
  maxLength?: number
}

function validateString(
  data: Record<string, unknown>,
  key: string,
  errors: ValidationError[],
  options: ValidateStringOptions = {}
): void {
  const path = options.path || key
  const value = data[key]

  if (value === undefined || value === null) {
    if (!options.optional) {
      errors.push({ path, message: "Required field is missing", value })
    }
    return
  }

  if (typeof value !== "string") {
    errors.push({ path, message: "Must be a string", value })
    return
  }

  if (isMalformed(value)) {
    errors.push({ path, message: "Contains malformed data", value: value.substring(0, 50) })
    return
  }

  if (options.minLength && value.length < options.minLength) {
    errors.push({ path, message: `Must be at least ${options.minLength} characters`, value })
  }

  if (options.maxLength && value.length > options.maxLength) {
    errors.push({ path, message: `Must be at most ${options.maxLength} characters`, value })
  }
}

function validateArray(
  data: Record<string, unknown>,
  key: string,
  errors: ValidationError[],
  itemValidator?: (item: unknown, index: number) => void
): void {
  const value = data[key]

  if (value === undefined || value === null) {
    data[key] = []
    return
  }

  if (!Array.isArray(value)) {
    errors.push({ path: key, message: "Must be an array", value })
    return
  }

  if (itemValidator) {
    value.forEach((item, index) => itemValidator(item, index))
  }
}

function isMalformed(value: string): boolean {
  const malformedPatterns = [
    /\[object Object\]/,
    /^undefined$/,
    /^null$/,
    /^NaN$/,
    /^\s*$/,
  ]
  return malformedPatterns.some(pattern => pattern.test(value))
}

function deepClean(obj: unknown): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    return {}
  }

  if (typeof obj !== "object") {
    return {}
  }

  if (Array.isArray(obj)) {
    return { array: obj.map(item => deepCleanValue(item)) }
  }

  const result: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = deepCleanValue(value)
  }

  return result
}

function deepCleanValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    if (isMalformed(value)) {
      return ""
    }
    return value.trim()
  }

  if (typeof value === "number") {
    if (isNaN(value)) {
      return 0
    }
    return value
  }

  if (typeof value === "boolean") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => deepCleanValue(item)).filter(item => item !== null && item !== "")
  }

  if (typeof value === "object") {
    const cleaned: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      cleaned[k] = deepCleanValue(v)
    }
    return cleaned
  }

  return value
}

export function cleanForTelegram(text: string | null | undefined): string {
  if (!text) return ""
  
  return text
    .replace(/\[object Object\]/g, "")
    .replace(/undefined/g, "")
    .replace(/null/g, "")
    .replace(/NaN/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
