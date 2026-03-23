import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import type { LLMModel, LLMResponse } from "../types/llm"
import { calculateCost } from "../types/llm"

let genAI: GoogleGenerativeAI | null = null

export function initializeGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.warn("Gemini API key not found")
    return null
  }

  genAI = new GoogleGenerativeAI(apiKey)
  console.log("Gemini client initialized")
  return genAI
}

export function getGemini(): GoogleGenerativeAI | null {
  return genAI
}

/** API ids aligned with AI Studio / KORA Agents (2.5 / 2.0 Flash); avoid -exp if it 404s. */
function getModelName(model: LLMModel): string {
  const modelMap: Record<string, string> = {
    "gemini-1.5-pro": "gemini-1.5-pro",
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-2.0-flash": "gemini-2.0-flash",
    "gemini-2.5-flash": "gemini-2.5-flash",
  }
  return modelMap[model] || model
}

export interface GeminiCompletionOptions {
  model: LLMModel
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: "text" | "json"
}

export async function geminiCompletion(
  options: GeminiCompletionOptions
): Promise<LLMResponse> {
  if (!genAI) {
    throw new Error("Gemini client not initialized")
  }

  const startTime = Date.now()
  const modelName = getModelName(options.model)
  
  const model: GenerativeModel = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 8192,
      temperature: options.temperature ?? 0.7,
    },
  })

  let fullPrompt = options.prompt
  if (options.systemPrompt) {
    fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`
  }

  if (options.responseFormat === "json") {
    fullPrompt += "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, just raw JSON."
  }

  const result = await model.generateContent(fullPrompt)
  const response = result.response
  const text = response.text()

  const latencyMs = Date.now() - startTime
  
  const usageMetadata = response.usageMetadata
  const promptTokens = usageMetadata?.promptTokenCount || estimateTokens(fullPrompt)
  const completionTokens = usageMetadata?.candidatesTokenCount || estimateTokens(text)
  const totalTokens = promptTokens + completionTokens
  const costUsd = calculateCost(options.model, promptTokens, completionTokens)

  let content = text
  if (options.responseFormat === "json") {
    content = cleanJSONResponse(text)
  }

  return {
    content,
    provider: "gemini",
    model: options.model,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs,
    cached: false,
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function cleanJSONResponse(text: string): string {
  let cleaned = text.trim()
  
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3)
  }
  
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3)
  }
  
  return cleaned.trim()
}

export async function geminiStructuredOutput<T>(
  options: GeminiCompletionOptions & { schema: Record<string, unknown> }
): Promise<{ data: T; response: LLMResponse }> {
  const response = await geminiCompletion({
    ...options,
    responseFormat: "json",
    systemPrompt: options.systemPrompt 
      ? `${options.systemPrompt}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`
      : `You MUST respond with valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`,
  })

  let data: T
  try {
    data = JSON.parse(response.content) as T
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON response: ${response.content.substring(0, 200)}`)
  }

  return { data, response }
}

export async function geminiLongContextSynthesis(
  documents: string[],
  synthesisPrompt: string,
  model: LLMModel = "gemini-1.5-pro"
): Promise<{ synthesis: string; response: LLMResponse }> {
  const combinedDocs = documents.map((doc, i) => `--- Document ${i + 1} ---\n${doc}`).join("\n\n")
  
  const response = await geminiCompletion({
    model,
    prompt: `${synthesisPrompt}\n\n${combinedDocs}`,
    temperature: 0.7,
  })

  return {
    synthesis: response.content,
    response,
  }
}

export async function geminiWebsiteAnalysis(
  htmlContent: string,
  analysisPrompt: string,
  model: LLMModel = "gemini-1.5-flash"
): Promise<{ analysis: Record<string, unknown>; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      tagline: { type: "string" },
      aboutSection: { type: "string" },
      services: { type: "array", items: { type: "string" } },
      brandSignals: { 
        type: "array", 
        items: { 
          type: "object",
          properties: {
            signal: { type: "string" },
            evidence: { type: "string" },
            confidence: { type: "number" }
          }
        }
      },
      toneAnalysis: {
        type: "object",
        properties: {
          overall: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          formality: { type: "string", enum: ["formal", "casual", "mixed"] }
        }
      },
      positioningClues: { type: "array", items: { type: "string" } }
    }
  }

  const { data, response } = await geminiStructuredOutput<Record<string, unknown>>({
    model,
    prompt: `${analysisPrompt}\n\nWebsite HTML:\n${htmlContent.substring(0, 100000)}`,
    schema,
    temperature: 0.5,
  })

  return { analysis: data, response }
}

export async function geminiProfileAnalysis(
  profileData: Record<string, unknown>,
  platform: string,
  model: LLMModel = "gemini-1.5-flash"
): Promise<{ analysis: Record<string, unknown>; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      contentThemes: { type: "array", items: { type: "string" } },
      postingPatterns: { type: "string" },
      engagementStyle: { type: "string" },
      audienceSignals: { type: "array", items: { type: "string" } },
      brandVoice: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } },
      confidenceScore: { type: "number" }
    }
  }

  const { data, response } = await geminiStructuredOutput<Record<string, unknown>>({
    model,
    prompt: `Analyze this ${platform} social media profile and extract insights about their brand, content strategy, and audience.\n\nProfile Data:\n${JSON.stringify(profileData, null, 2)}`,
    schema,
    temperature: 0.5,
  })

  return { analysis: data, response }
}

export async function geminiBrandSynthesis(
  intakeData: Record<string, string>,
  researchContext: Record<string, unknown>,
  model: LLMModel = "gemini-1.5-pro"
): Promise<{ brandInsights: Record<string, unknown>; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      brandEssence: { 
        type: "object",
        properties: {
          statement: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string", enum: ["user_input", "research", "inferred"] }
        }
      },
      missionStatement: {
        type: "object",
        properties: {
          statement: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string" }
        }
      },
      visionStatement: {
        type: "object",
        properties: {
          statement: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string" }
        }
      },
      coreValues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            value: { type: "string" },
            explanation: { type: "string" },
            confidence: { type: "number" },
            source: { type: "string" }
          }
        }
      },
      brandPersonality: {
        type: "array",
        items: {
          type: "object",
          properties: {
            trait: { type: "string" },
            description: { type: "string" },
            confidence: { type: "number" }
          }
        }
      },
      uniqueValueProposition: {
        type: "object",
        properties: {
          statement: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string" }
        }
      },
      brandVoice: {
        type: "object",
        properties: {
          tone: { type: "string" },
          languageStyle: { type: "string" },
          principles: { type: "array", items: { type: "string" } },
          confidence: { type: "number" }
        }
      },
      positioningStatement: {
        type: "object",
        properties: {
          statement: { type: "string" },
          confidence: { type: "number" }
        }
      },
      lowConfidenceSections: { type: "array", items: { type: "string" } },
      researchGaps: { 
        type: "array", 
        items: { 
          type: "object",
          properties: {
            section: { type: "string" },
            gapDescription: { type: "string" }
          }
        }
      }
    }
  }

  const { data, response } = await geminiStructuredOutput<Record<string, unknown>>({
    model,
    prompt: `You are an expert brand strategist. Synthesize the following user intake responses and research context to create a comprehensive brand identity analysis.

For each section, provide:
1. The actual content
2. A confidence score (0-1) based on how much evidence supports it
3. The source type: "user_input" if directly from user, "research" if from research context, "inferred" if deduced

Be specific and avoid generic language. Flag any sections where you have low confidence or need more information.

USER INTAKE RESPONSES:
${JSON.stringify(intakeData, null, 2)}

RESEARCH CONTEXT:
${JSON.stringify(researchContext, null, 2)}`,
    schema,
    temperature: 0.7,
  })

  return { brandInsights: data, response }
}

export async function geminiAudienceSynthesis(
  intakeData: Record<string, string>,
  socialAudits: Record<string, unknown>[],
  brandBlueprint: Record<string, unknown>,
  model: LLMModel = "gemini-1.5-pro"
): Promise<{ audienceInsights: Record<string, unknown>; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      overview: {
        type: "object",
        properties: {
          text: { type: "string" },
          confidence: { type: "number" }
        }
      },
      primaryAudience: {
        type: "object",
        properties: {
          demographics: { type: "string" },
          psychographics: { type: "string" },
          painPoints: { type: "array", items: { type: "string" } },
          aspirations: { type: "array", items: { type: "string" } },
          confidence: { type: "number" }
        }
      },
      audienceSegments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            sizeEstimate: { type: "string" },
            engagementApproach: { type: "string" },
            confidence: { type: "number" },
            source: { type: "string" }
          }
        }
      },
      verifiedSignals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            signal: { type: "string" },
            source: { type: "string" },
            evidence: { type: "string" }
          }
        }
      },
      inferredAssumptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            assumption: { type: "string" },
            basis: { type: "string" },
            confidence: { type: "number" }
          }
        }
      },
      lowConfidenceSections: { type: "array", items: { type: "string" } },
      researchGaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section: { type: "string" },
            gapDescription: { type: "string" }
          }
        }
      }
    }
  }

  const { data, response } = await geminiStructuredOutput<Record<string, unknown>>({
    model,
    prompt: `You are an audience research specialist. Analyze the user's intake responses, social media audit data, and brand blueprint to create a comprehensive target audience analysis.

Distinguish between:
- VERIFIED SIGNALS: Evidence directly observed from research (social audits, engagement data)
- INFERRED ASSUMPTIONS: Educated guesses based on limited information

USER INTAKE RESPONSES:
${JSON.stringify(intakeData, null, 2)}

SOCIAL MEDIA AUDITS:
${JSON.stringify(socialAudits, null, 2)}

BRAND BLUEPRINT:
${JSON.stringify(brandBlueprint, null, 2)}`,
    schema,
    temperature: 0.7,
  })

  return { audienceInsights: data, response }
}

export async function geminiStrategySynthesis(
  brandBlueprint: Record<string, unknown>,
  audienceAnalysis: Record<string, unknown>,
  intakeData: Record<string, string>,
  socialAudits: Record<string, unknown>[],
  model: LLMModel = "gemini-1.5-pro"
): Promise<{ strategyInsights: Record<string, unknown>; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      contentPillars: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            contentTypes: { type: "array", items: { type: "string" } },
            frequency: { type: "string" },
            confidence: { type: "number" },
            rationale: { type: "string" }
          }
        }
      },
      platformStrategy: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: { type: "string" },
            focus: { type: "string" },
            contentTypes: { type: "array", items: { type: "string" } },
            postingFrequency: { type: "string" },
            confidence: { type: "number" }
          }
        }
      },
      exampleWeek: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "string" },
            contentType: { type: "string" },
            topic: { type: "string" },
            platform: { type: "string" },
            rationale: { type: "string" }
          }
        }
      },
      growthStrategy: {
        type: "object",
        properties: {
          text: { type: "string" },
          confidence: { type: "number" }
        }
      },
      lowConfidenceSections: { type: "array", items: { type: "string" } },
      researchGaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section: { type: "string" },
            gapDescription: { type: "string" }
          }
        }
      }
    }
  }

  const { data, response } = await geminiStructuredOutput<Record<string, unknown>>({
    model,
    prompt: `You are a content strategy expert. Create a comprehensive content strategy based on the brand blueprint, audience analysis, and user intake data.

Focus on:
1. Actionable content pillars with clear rationale
2. Platform-specific recommendations based on where the audience is
3. A realistic example week that demonstrates the strategy in practice
4. Growth tactics specific to their industry and audience

BRAND BLUEPRINT:
${JSON.stringify(brandBlueprint, null, 2)}

AUDIENCE ANALYSIS:
${JSON.stringify(audienceAnalysis, null, 2)}

USER INTAKE:
${JSON.stringify(intakeData, null, 2)}

SOCIAL AUDITS:
${JSON.stringify(socialAudits, null, 2)}`,
    schema,
    temperature: 0.7,
  })

  return { strategyInsights: data, response }
}
