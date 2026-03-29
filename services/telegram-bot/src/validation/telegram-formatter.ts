export function formatForTelegram(text: string, options?: {
  parseMode?: "Markdown" | "HTML"
  maxLength?: number
}): string {
  const parseMode = options?.parseMode || "Markdown"
  const maxLength = options?.maxLength || 4096

  let formatted = cleanText(text)

  if (parseMode === "Markdown") {
    formatted = escapeMarkdown(formatted)
  } else if (parseMode === "HTML") {
    formatted = escapeHtml(formatted)
  }

  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - 3) + "..."
  }

  return formatted
}

function cleanText(text: string): string {
  return text
    .replace(/\[object Object\]/g, "")
    .replace(/undefined/g, "")
    .replace(/null/g, "")
    .replace(/NaN/g, "")
    .replace(/^\s*[\r\n]/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function escapeMarkdown(text: string): string {
  const specialChars = /([_*\[\]()~`>#+=|{}.!\\-])/g
  
  const parts = text.split(/(\*[^*]+\*|_[^_]+_)/g)
  
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return part
    }
    return part.replace(specialChars, "\\$1")
  }).join("")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function splitMessage(text: string, maxLength: number = 4096): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const messages: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining)
      break
    }

    let splitPoint = remaining.lastIndexOf("\n\n", maxLength)
    
    if (splitPoint === -1 || splitPoint < maxLength / 2) {
      splitPoint = remaining.lastIndexOf("\n", maxLength)
    }
    
    if (splitPoint === -1 || splitPoint < maxLength / 2) {
      splitPoint = remaining.lastIndexOf(" ", maxLength)
    }
    
    if (splitPoint === -1) {
      splitPoint = maxLength
    }

    messages.push(remaining.substring(0, splitPoint).trim())
    remaining = remaining.substring(splitPoint).trim()
  }

  return messages
}

export function formatBulletList(items: string[]): string {
  if (items.length === 0) return ""
  return items.map(item => `• ${cleanText(item)}`).join("\n")
}

export function formatNumberedList(items: string[]): string {
  if (items.length === 0) return ""
  return items.map((item, i) => `${i + 1}. ${cleanText(item)}`).join("\n")
}

export function formatSection(title: string, content: string): string {
  const cleanedContent = cleanText(content)
  if (!cleanedContent) return ""
  return `*${title}*\n${cleanedContent}\n`
}

export function formatKeyValue(key: string, value: string | null | undefined): string {
  const cleanedValue = cleanText(value || "")
  if (!cleanedValue) return ""
  return `*${key}:* ${cleanedValue}`
}

export interface TelegramMessage {
  text: string
  parseMode: "Markdown" | "HTML"
}

export function formatDeliverableForTelegram(
  type: "brand_blueprint" | "content_strategy" | "audience_analysis",
  data: Record<string, unknown>
): TelegramMessage[] {
  const messages: TelegramMessage[] = []

  switch (type) {
    case "brand_blueprint":
      messages.push(...formatBrandBlueprintMessages(data))
      break
    case "content_strategy":
      messages.push(...formatContentStrategyMessages(data))
      break
    case "audience_analysis":
      messages.push(...formatAudienceAnalysisMessages(data))
      break
  }

  return messages
}

function formatBrandBlueprintMessages(data: Record<string, unknown>): TelegramMessage[] {
  const messages: TelegramMessage[] = []
  
  let intro = "*Brand Identity Blueprint*\n\n"
  
  if (data.brandEssence) {
    intro += formatSection("Brand Essence", data.brandEssence as string) + "\n"
  }
  if (data.missionStatement) {
    intro += formatSection("Mission", data.missionStatement as string) + "\n"
  }
  if (data.visionStatement) {
    intro += formatSection("Vision", data.visionStatement as string) + "\n"
  }

  messages.push({ text: intro.trim(), parseMode: "Markdown" })

  if (Array.isArray(data.coreValues) && data.coreValues.length > 0) {
    let valuesText = "*Core Values*\n\n"
    for (const cv of data.coreValues as Array<{ value?: string; explanation?: string }>) {
      if (cv.value) {
        valuesText += `*${cleanText(cv.value)}*`
        if (cv.explanation) {
          valuesText += `: ${cleanText(cv.explanation)}`
        }
        valuesText += "\n\n"
      }
    }
    messages.push({ text: valuesText.trim(), parseMode: "Markdown" })
  }

  let moreContent = ""
  if (data.uniqueValueProposition) {
    moreContent += formatSection("Unique Value Proposition", data.uniqueValueProposition as string) + "\n"
  }
  if (data.positioningStatement) {
    moreContent += formatSection("Positioning", data.positioningStatement as string) + "\n"
  }
  
  if (moreContent) {
    messages.push({ text: moreContent.trim(), parseMode: "Markdown" })
  }

  return messages
}

function formatContentStrategyMessages(data: Record<string, unknown>): TelegramMessage[] {
  const messages: TelegramMessage[] = []
  
  let intro = "*Content Strategy*\n\n"
  
  if (Array.isArray(data.contentPillars) && data.contentPillars.length > 0) {
    intro += "*Content Pillars*\n\n"
    for (const pillar of data.contentPillars as Array<{ name?: string; description?: string; frequency?: string }>) {
      if (pillar.name) {
        intro += `*${cleanText(pillar.name)}*\n`
        if (pillar.description) {
          intro += `${cleanText(pillar.description)}\n`
        }
        if (pillar.frequency) {
          intro += `Frequency: ${cleanText(pillar.frequency)}\n`
        }
        intro += "\n"
      }
    }
  }

  messages.push({ text: intro.trim(), parseMode: "Markdown" })

  if (Array.isArray(data.platformStrategy) && data.platformStrategy.length > 0) {
    let platformText = "*Platform Strategy*\n\n"
    for (const ps of data.platformStrategy as Array<{ platform?: string; focus?: string; postingFrequency?: string }>) {
      if (ps.platform) {
        platformText += `*${cleanText(ps.platform)}*\n`
        if (ps.focus) {
          platformText += `Focus: ${cleanText(ps.focus)}\n`
        }
        if (ps.postingFrequency) {
          platformText += `Posting: ${cleanText(ps.postingFrequency)}\n`
        }
        platformText += "\n"
      }
    }
    messages.push({ text: platformText.trim(), parseMode: "Markdown" })
  }

  if (Array.isArray(data.keyTips) && data.keyTips.length > 0) {
    let tipsText = "*Key Tips*\n\n"
    tipsText += formatBulletList(data.keyTips as string[])
    messages.push({ text: tipsText.trim(), parseMode: "Markdown" })
  }

  return messages
}

function formatAudienceAnalysisMessages(data: Record<string, unknown>): TelegramMessage[] {
  const messages: TelegramMessage[] = []
  
  let intro = "*Target Audience Analysis*\n\n"
  
  if (data.overview) {
    intro += formatSection("Overview", data.overview as string) + "\n"
  }

  const pa = data.primaryAudience as { demographics?: string; psychographics?: string } | undefined
  if (pa) {
    intro += "*Primary Audience*\n"
    if (pa.demographics) {
      intro += `Demographics: ${cleanText(pa.demographics)}\n`
    }
    if (pa.psychographics) {
      intro += `Psychographics: ${cleanText(pa.psychographics)}\n`
    }
    intro += "\n"
  }

  messages.push({ text: intro.trim(), parseMode: "Markdown" })

  if (Array.isArray(data.audienceSegments) && data.audienceSegments.length > 0) {
    let segmentsText = "*Audience Segments*\n\n"
    for (const seg of data.audienceSegments as Array<{ name?: string; description?: string; engagementApproach?: string }>) {
      if (seg.name) {
        segmentsText += `*${cleanText(seg.name)}*\n`
        if (seg.description) {
          segmentsText += `${cleanText(seg.description)}\n`
        }
        if (seg.engagementApproach) {
          segmentsText += `Approach: ${cleanText(seg.engagementApproach)}\n`
        }
        segmentsText += "\n"
      }
    }
    messages.push({ text: segmentsText.trim(), parseMode: "Markdown" })
  }

  return messages
}
