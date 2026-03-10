/**
 * Regenerate Strategy Documents with PDF Output
 * 
 * This script:
 * 1. Fetches intake sessions for specific users (Juss and Jocelyn)
 * 2. Regenerates Brand Blueprint, Content Strategy, and Audience Analysis
 * 3. Generates professional PDFs with JahknowsPR branding
 * 4. Sends PDFs via Telegram
 * 5. Saves data to database for dashboard display
 */

import { createClient } from "@supabase/supabase-js"
import TelegramBot from "node-telegram-bot-api"
import OpenAI from "openai"
import { jsPDF } from "jspdf"
import dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })

// Target users for regeneration
const TARGET_USERS = [
  { 
    telegramId: 8216104620, 
    name: "Juss",
    email: "Justicevaughn7@gmail.com"
  },
  { 
    telegramId: 8697293004, 
    name: "Jocelyn",
    email: "jocelyncavinessbrigman@gmail.com"
  }
]

// Brand colors
const COLORS = {
  darkBlue: "#0A1A35",
  goldStart: "#E6C769",
  goldEnd: "#B89434",
  white: "#FFFFFF",
  lightGray: "#F5F5F5"
}

// ============================================================================
// INTERFACES
// ============================================================================

interface IntakeSession {
  id: string
  telegram_id: number
  telegram_username: string | null
  current_question_id: string | null
  phase: string
  responses: Record<string, string>
  started_at: string
  last_activity: string
  client_id: string | null
}

interface BrandBlueprint {
  brand_essence: string
  mission_statement: string
  vision_statement: string
  core_values: string[]
  brand_personality: string
  unique_value_proposition: string
  brand_voice: {
    tone: string
    language_style: string
    communication_principles: string[]
  }
  visual_identity_guidelines: {
    color_psychology: string
    imagery_style: string
    typography_direction: string
  }
}

interface ContentStrategy {
  content_pillars: Array<{
    pillar_name: string
    description: string
    content_types: string[]
    posting_frequency: string
  }>
  content_themes: string[]
  posting_schedule: {
    optimal_times: string[]
    frequency_by_platform: Record<string, string>
  }
  engagement_strategy: string
  content_calendar_example: Array<{
    day: string
    content_type: string
    topic: string
    platform: string
  }>
}

interface AudienceAnalysis {
  primary_audience: {
    demographics: string
    psychographics: string
    pain_points: string[]
    aspirations: string[]
  }
  secondary_audiences: Array<{
    segment_name: string
    description: string
    engagement_approach: string
  }>
  audience_journey: {
    awareness_stage: string
    consideration_stage: string
    decision_stage: string
  }
  engagement_triggers: string[]
  content_preferences: string[]
}

// ============================================================================
// GENERATION FUNCTIONS
// ============================================================================

async function generateBrandBlueprint(responses: Record<string, string>): Promise<BrandBlueprint> {
  console.log("  Calling OpenAI for Brand Blueprint...")
  
  const prompt = `You are a professional brand strategist at a top PR firm. Based on the following intake responses, create a comprehensive Brand Identity Blueprint.

INTAKE RESPONSES:
${JSON.stringify(responses, null, 2)}

Create a detailed brand blueprint in JSON format with these exact fields:
- brand_essence: A single powerful sentence capturing the brand's core identity
- mission_statement: A clear statement of purpose
- vision_statement: Aspirational future state
- core_values: Array of 4-5 core values with brief explanations
- brand_personality: Description of brand character
- unique_value_proposition: What makes this brand unique
- brand_voice: Object with tone, language_style, and communication_principles array
- visual_identity_guidelines: Object with color_psychology, imagery_style, typography_direction

Return ONLY valid JSON, no markdown or explanation.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  })

  return JSON.parse(response.choices[0].message.content || "{}")
}

async function generateContentStrategy(responses: Record<string, string>, blueprint: BrandBlueprint): Promise<ContentStrategy> {
  console.log("  Calling OpenAI for Content Strategy...")
  
  const prompt = `You are a content strategy expert at a top PR firm. Based on the intake responses and brand blueprint, create a comprehensive Content Strategy.

INTAKE RESPONSES:
${JSON.stringify(responses, null, 2)}

BRAND BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

Create a detailed content strategy in JSON format with these exact fields:
- content_pillars: Array of 3-4 pillars, each with pillar_name, description, content_types array, posting_frequency
- content_themes: Array of 8-10 specific content themes/topics
- posting_schedule: Object with optimal_times array and frequency_by_platform object
- engagement_strategy: Detailed approach to audience engagement
- content_calendar_example: Array of 7 entries (one week), each with day, content_type, topic, platform

Return ONLY valid JSON, no markdown or explanation.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  })

  return JSON.parse(response.choices[0].message.content || "{}")
}

async function generateAudienceAnalysis(responses: Record<string, string>, blueprint: BrandBlueprint): Promise<AudienceAnalysis> {
  console.log("  Calling OpenAI for Audience Analysis...")
  
  const prompt = `You are an audience research specialist at a top PR firm. Based on the intake responses and brand blueprint, create a comprehensive Target Audience Analysis.

INTAKE RESPONSES:
${JSON.stringify(responses, null, 2)}

BRAND BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

Create a detailed audience analysis in JSON format with these exact fields:
- primary_audience: Object with demographics, psychographics, pain_points array, aspirations array
- secondary_audiences: Array of 2-3 segments, each with segment_name, description, engagement_approach
- audience_journey: Object with awareness_stage, consideration_stage, decision_stage
- engagement_triggers: Array of 5-6 triggers that motivate this audience
- content_preferences: Array of content format/style preferences

Return ONLY valid JSON, no markdown or explanation.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  })

  return JSON.parse(response.choices[0].message.content || "{}")
}

// ============================================================================
// PDF GENERATION FUNCTIONS
// ============================================================================

function addHeader(doc: jsPDF, title: string, businessName: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Header background
  doc.setFillColor(10, 26, 53) // Dark blue
  doc.rect(0, 0, pageWidth, 40, "F")
  
  // Logo text (JK PR)
  doc.setTextColor(230, 199, 105) // Gold
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("JK", 20, 22)
  doc.text("PR", 20, 34)
  
  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text(title, pageWidth / 2, 22, { align: "center" })
  
  // Business name
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Prepared for: ${businessName}`, pageWidth / 2, 34, { align: "center" })
  
  // Date on right
  doc.setFontSize(10)
  const date = new Date().toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  })
  doc.text(date, pageWidth - 20, 28, { align: "right" })
}

function addFooter(doc: jsPDF, pageNum: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  doc.setFillColor(10, 26, 53)
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F")
  
  doc.setTextColor(230, 199, 105)
  doc.setFontSize(10)
  doc.text("JahKnowsPR Firm", 20, pageHeight - 5)
  doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 5, { align: "right" })
}

function addSection(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(230, 199, 105) // Gold
  doc.rect(15, y - 5, 3, 12, "F")
  
  doc.setTextColor(10, 26, 53) // Dark blue
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(title, 22, y + 3)
  
  return y + 15
}

function addText(doc: jsPDF, text: string, y: number, maxWidth: number = 170): number {
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, 20, y)
  
  return y + (lines.length * 6) + 5
}

function addBulletList(doc: jsPDF, items: string[], y: number): number {
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  
  for (const item of items) {
    // Safely serialize item to string
    const itemText = serializeToString(item)
    if (!itemText || itemText === "[object Object]") continue
    
    doc.setFillColor(230, 199, 105)
    doc.circle(22, y - 2, 1.5, "F")
    
    const lines = doc.splitTextToSize(itemText, 160)
    doc.text(lines, 28, y)
    y += lines.length * 6 + 3
  }
  
  return y + 5
}

/**
 * Safely serialize any value to a readable string
 * Handles objects, arrays, and nested structures
 */
function serializeToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  
  if (typeof value === "string") {
    return value
  }
  
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  
  if (Array.isArray(value)) {
    return value.map(v => serializeToString(v)).filter(Boolean).join(", ")
  }
  
  if (typeof value === "object") {
    // Handle specific known object structures
    const obj = value as Record<string, unknown>
    
    // If it has a 'value' or 'name' property, use that
    if (obj.value && typeof obj.value === "string") return obj.value
    if (obj.name && typeof obj.name === "string") return obj.name
    if (obj.text && typeof obj.text === "string") return obj.text
    if (obj.content && typeof obj.content === "string") return obj.content
    
    // If it has a description, use name + description
    if (obj.name && obj.description) {
      return `${obj.name}: ${obj.description}`
    }
    
    // For pillars/themes with description
    if (obj.pillar_name && obj.description) {
      return `${obj.pillar_name}: ${obj.description}`
    }
    
    // Try to extract meaningful content
    const meaningfulKeys = ["value", "name", "text", "content", "title", "description", "statement"]
    for (const key of meaningfulKeys) {
      if (obj[key] && typeof obj[key] === "string") {
        return obj[key] as string
      }
    }
    
    // Last resort: try JSON stringify but make it readable
    try {
      const simplified = Object.entries(obj)
        .filter(([_, v]) => typeof v === "string" || typeof v === "number")
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ")
      
      return simplified || ""
    } catch {
      return ""
    }
  }
  
  return String(value)
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 40): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - 25) {
    addFooter(doc, doc.getNumberOfPages())
    doc.addPage()
    return 50
  }
  return y
}

function generateBrandBlueprintPDF(blueprint: BrandBlueprint, businessName: string): Buffer {
  const doc = new jsPDF()
  let y = 50
  
  addHeader(doc, "BRAND IDENTITY BLUEPRINT", businessName)
  
  // Brand Essence
  y = addSection(doc, "Brand Essence", y)
  y = addText(doc, serializeToString(blueprint.brand_essence) || "Not defined", y)
  
  // Mission Statement
  y = checkPageBreak(doc, y)
  y = addSection(doc, "Mission Statement", y)
  y = addText(doc, serializeToString(blueprint.mission_statement) || "Not defined", y)
  
  // Vision Statement
  y = checkPageBreak(doc, y)
  y = addSection(doc, "Vision Statement", y)
  y = addText(doc, serializeToString(blueprint.vision_statement) || "Not defined", y)
  
  // Core Values
  y = checkPageBreak(doc, y, 60)
  y = addSection(doc, "Core Values", y)
  if (blueprint.core_values?.length) {
    // Handle both string arrays and object arrays
    const valueStrings = blueprint.core_values.map(v => serializeToString(v)).filter(Boolean)
    if (valueStrings.length > 0) {
      y = addBulletList(doc, valueStrings, y)
    }
  }
  
  // Brand Personality
  y = checkPageBreak(doc, y)
  y = addSection(doc, "Brand Personality", y)
  y = addText(doc, serializeToString(blueprint.brand_personality) || "Not defined", y)
  
  // Unique Value Proposition
  y = checkPageBreak(doc, y)
  y = addSection(doc, "Unique Value Proposition", y)
  y = addText(doc, serializeToString(blueprint.unique_value_proposition) || "Not defined", y)
  
  // Brand Voice
  y = checkPageBreak(doc, y, 80)
  y = addSection(doc, "Brand Voice", y)
  if (blueprint.brand_voice) {
    const tone = typeof blueprint.brand_voice === "object" 
      ? serializeToString(blueprint.brand_voice.tone) 
      : serializeToString(blueprint.brand_voice)
    y = addText(doc, `Tone: ${tone || "Not defined"}`, y)
    
    if (typeof blueprint.brand_voice === "object") {
      y = addText(doc, `Language Style: ${serializeToString(blueprint.brand_voice.language_style) || "Not defined"}`, y)
      if (blueprint.brand_voice.communication_principles?.length) {
        doc.setFont("helvetica", "bold")
        doc.text("Communication Principles:", 20, y)
        y += 8
        doc.setFont("helvetica", "normal")
        const principles = blueprint.brand_voice.communication_principles.map(p => serializeToString(p)).filter(Boolean)
        y = addBulletList(doc, principles, y)
      }
    }
  }
  
  // Visual Identity Guidelines
  y = checkPageBreak(doc, y, 60)
  y = addSection(doc, "Visual Identity Guidelines", y)
  if (blueprint.visual_identity_guidelines) {
    y = addText(doc, `Color Psychology: ${serializeToString(blueprint.visual_identity_guidelines.color_psychology) || "Not defined"}`, y)
    y = addText(doc, `Imagery Style: ${serializeToString(blueprint.visual_identity_guidelines.imagery_style) || "Not defined"}`, y)
    y = addText(doc, `Typography Direction: ${serializeToString(blueprint.visual_identity_guidelines.typography_direction) || "Not defined"}`, y)
  }
  
  addFooter(doc, doc.getNumberOfPages())
  
  return Buffer.from(doc.output("arraybuffer"))
}

function generateContentStrategyPDF(strategy: ContentStrategy, businessName: string): Buffer {
  const doc = new jsPDF()
  let y = 50
  
  addHeader(doc, "CONTENT STRATEGY", businessName)
  
  // Content Pillars
  y = addSection(doc, "Content Pillars", y)
  if (strategy.content_pillars?.length) {
    for (const pillar of strategy.content_pillars) {
      y = checkPageBreak(doc, y, 40)
      
      const pillarName = serializeToString(pillar.pillar_name) || "Content Pillar"
      
      doc.setTextColor(10, 26, 53)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(pillarName, 20, y)
      y += 7
      
      doc.setFont("helvetica", "normal")
      y = addText(doc, serializeToString(pillar.description) || "", y)
      y = addText(doc, `Posting Frequency: ${serializeToString(pillar.posting_frequency) || "TBD"}`, y)
      
      if (pillar.content_types?.length) {
        const types = pillar.content_types.map(t => serializeToString(t)).filter(Boolean)
        if (types.length > 0) {
          y = addText(doc, `Content Types: ${types.join(", ")}`, y)
        }
      }
      y += 5
    }
  }
  
  // Content Themes
  y = checkPageBreak(doc, y, 60)
  y = addSection(doc, "Content Themes", y)
  if (strategy.content_themes?.length) {
    const themes = strategy.content_themes.map(t => serializeToString(t)).filter(Boolean)
    if (themes.length > 0) {
      y = addBulletList(doc, themes, y)
    }
  }
  
  // Posting Schedule
  y = checkPageBreak(doc, y, 40)
  y = addSection(doc, "Posting Schedule", y)
  if (strategy.posting_schedule) {
    if (strategy.posting_schedule.optimal_times?.length) {
      const times = strategy.posting_schedule.optimal_times.map(t => serializeToString(t)).filter(Boolean)
      if (times.length > 0) {
        y = addText(doc, `Optimal Times: ${times.join(", ")}`, y)
      }
    }
    if (strategy.posting_schedule.frequency_by_platform) {
      const platforms = Object.entries(strategy.posting_schedule.frequency_by_platform)
        .map(([platform, freq]) => `${platform}: ${serializeToString(freq)}`)
        .filter(p => !p.includes("[object Object]"))
      if (platforms.length > 0) {
        y = addBulletList(doc, platforms, y)
      }
    }
  }
  
  // Engagement Strategy
  y = checkPageBreak(doc, y)
  y = addSection(doc, "Engagement Strategy", y)
  y = addText(doc, serializeToString(strategy.engagement_strategy) || "Not defined", y)
  
  // Example Week
  y = checkPageBreak(doc, y, 80)
  y = addSection(doc, "Example Content Week", y)
  if (strategy.content_calendar_example?.length) {
    for (const day of strategy.content_calendar_example) {
      y = checkPageBreak(doc, y, 15)
      const dayStr = serializeToString(day.day) || "Day"
      const typeStr = serializeToString(day.content_type) || "Content"
      const topicStr = serializeToString(day.topic) || "Topic"
      const platformStr = serializeToString(day.platform) || "Platform"
      const dayText = `${dayStr}: ${typeStr} - "${topicStr}" (${platformStr})`
      y = addText(doc, dayText, y)
    }
  }
  
  addFooter(doc, doc.getNumberOfPages())
  
  return Buffer.from(doc.output("arraybuffer"))
}

function generateAudienceAnalysisPDF(analysis: AudienceAnalysis, businessName: string): Buffer {
  const doc = new jsPDF()
  let y = 50
  
  addHeader(doc, "TARGET AUDIENCE ANALYSIS", businessName)
  
  // Primary Audience
  y = addSection(doc, "Primary Audience", y)
  if (analysis.primary_audience) {
    y = addText(doc, `Demographics: ${serializeToString(analysis.primary_audience.demographics) || "Not defined"}`, y)
    y = addText(doc, `Psychographics: ${serializeToString(analysis.primary_audience.psychographics) || "Not defined"}`, y)
    
    if (analysis.primary_audience.pain_points?.length) {
      y = checkPageBreak(doc, y, 40)
      doc.setFont("helvetica", "bold")
      doc.text("Pain Points:", 20, y)
      y += 8
      doc.setFont("helvetica", "normal")
      const painPoints = analysis.primary_audience.pain_points.map(p => serializeToString(p)).filter(Boolean)
      if (painPoints.length > 0) {
        y = addBulletList(doc, painPoints, y)
      }
    }
    
    if (analysis.primary_audience.aspirations?.length) {
      y = checkPageBreak(doc, y, 40)
      doc.setFont("helvetica", "bold")
      doc.text("Aspirations:", 20, y)
      y += 8
      doc.setFont("helvetica", "normal")
      const aspirations = analysis.primary_audience.aspirations.map(a => serializeToString(a)).filter(Boolean)
      if (aspirations.length > 0) {
        y = addBulletList(doc, aspirations, y)
      }
    }
  }
  
  // Secondary Audiences
  y = checkPageBreak(doc, y, 60)
  y = addSection(doc, "Secondary Audiences", y)
  if (analysis.secondary_audiences?.length) {
    for (const segment of analysis.secondary_audiences) {
      y = checkPageBreak(doc, y, 30)
      
      const segmentName = serializeToString(segment.segment_name) || "Secondary Segment"
      
      doc.setTextColor(10, 26, 53)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(segmentName, 20, y)
      y += 7
      
      doc.setFont("helvetica", "normal")
      y = addText(doc, serializeToString(segment.description) || "", y)
      y = addText(doc, `Engagement Approach: ${serializeToString(segment.engagement_approach) || "TBD"}`, y)
      y += 5
    }
  }
  
  // Audience Journey
  y = checkPageBreak(doc, y, 60)
  y = addSection(doc, "Audience Journey", y)
  if (analysis.audience_journey) {
    y = addText(doc, `Awareness Stage: ${serializeToString(analysis.audience_journey.awareness_stage) || "Not defined"}`, y)
    y = addText(doc, `Consideration Stage: ${serializeToString(analysis.audience_journey.consideration_stage) || "Not defined"}`, y)
    y = addText(doc, `Decision Stage: ${serializeToString(analysis.audience_journey.decision_stage) || "Not defined"}`, y)
  }
  
  // Engagement Triggers
  y = checkPageBreak(doc, y, 40)
  y = addSection(doc, "Engagement Triggers", y)
  if (analysis.engagement_triggers?.length) {
    const triggers = analysis.engagement_triggers.map(t => serializeToString(t)).filter(Boolean)
    if (triggers.length > 0) {
      y = addBulletList(doc, triggers, y)
    }
  }
  
  // Content Preferences
  y = checkPageBreak(doc, y, 40)
  y = addSection(doc, "Content Preferences", y)
  if (analysis.content_preferences?.length) {
    const prefs = analysis.content_preferences.map(p => serializeToString(p)).filter(Boolean)
    if (prefs.length > 0) {
      y = addBulletList(doc, prefs, y)
    }
  }
  
  addFooter(doc, doc.getNumberOfPages())
  
  return Buffer.from(doc.output("arraybuffer"))
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function saveToDatabase(
  telegramId: number,
  businessName: string,
  blueprint: BrandBlueprint,
  strategy: ContentStrategy,
  audience: AudienceAnalysis,
  userEmail: string
) {
  console.log(`  Saving to database for ${businessName}...`)
  
  // First, try to link telegram to auth user via the SQL function
  const { data: linkedCustomerId, error: linkError } = await supabase.rpc(
    "link_telegram_to_auth_user",
    {
      p_telegram_id: telegramId,
      p_email: userEmail,
      p_business_name: businessName
    }
  )
  
  if (linkError) {
    console.log(`  Note: Could not link via function (may not exist yet): ${linkError.message}`)
  }
  
  let customerId = linkedCustomerId
  
  // If function didn't work, try manual approach
  if (!customerId) {
    // Check if customer exists by telegram_id
    const { data: existingByTelegram } = await supabase
      .from("customers")
      .select("id")
      .eq("telegram_id", telegramId)
      .single()
    
    customerId = existingByTelegram?.id
    
    if (!customerId) {
      // Find auth user by email
      const { data: userData } = await supabase.auth.admin.listUsers()
      const authUser = userData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase())
      
      if (authUser) {
        // Check if customer exists for this auth user
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", authUser.id)
          .single()
        
        if (existingCustomer) {
          // Update existing customer with telegram_id
          await supabase
            .from("customers")
            .update({ 
              telegram_id: telegramId, 
              business_name: businessName,
              email: userEmail 
            })
            .eq("id", existingCustomer.id)
          
          customerId = existingCustomer.id
          console.log(`  Linked telegram to existing customer: ${customerId}`)
        } else {
          // Create new customer for auth user
          const { data: newCustomer, error: createError } = await supabase
            .from("customers")
            .insert({
              user_id: authUser.id,
              telegram_id: telegramId,
              business_name: businessName,
              email: userEmail
            })
            .select("id")
            .single()
          
          if (createError) {
            console.error("  Error creating customer:", createError)
          }
          customerId = newCustomer?.id
          console.log(`  Created new customer: ${customerId}`)
        }
      } else {
        // No auth user found, create standalone customer
        const clientIdSlug = businessName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        const { data: standaloneCustomer, error: standaloneError } = await supabase
          .from("customers")
          .upsert({
            id: clientIdSlug,
            telegram_id: telegramId,
            business_name: businessName,
            email: userEmail
          }, { onConflict: "telegram_id" })
          .select("id")
          .single()
        
        if (standaloneError) {
          console.error("  Error creating standalone customer:", standaloneError)
        }
        customerId = standaloneCustomer?.id || clientIdSlug
        console.log(`  Created standalone customer: ${customerId}`)
      }
    }
  }
  
  // Delete existing records for this telegram_id to avoid duplicates
  await supabase.from("brand_blueprints").delete().eq("telegram_id", telegramId)
  await supabase.from("content_strategies").delete().eq("telegram_id", telegramId)
  await supabase.from("audience_analyses").delete().eq("telegram_id", telegramId)
  
  // Save Brand Blueprint
  const { error: blueprintError } = await supabase
    .from("brand_blueprints")
    .insert({
      client_id: customerId,
      telegram_id: telegramId,
      business_name: businessName,
      business_type: "Professional Services",
      mission: blueprint.mission_statement,
      vision: blueprint.vision_statement,
      core_values: blueprint.core_values,
      unique_value_proposition: blueprint.unique_value_proposition,
      brand_personality: [blueprint.brand_personality],
      brand_voice: blueprint.brand_voice?.tone,
      avoid_perceptions: [],
      brand_story: blueprint.brand_essence,
      positioning_statement: blueprint.unique_value_proposition,
      generated_at: new Date().toISOString()
    })
  
  if (blueprintError) {
    console.error("  Error saving brand blueprint:", blueprintError)
  } else {
    console.log("  Brand blueprint saved")
  }
  
  // Save Content Strategy
  const { error: strategyError } = await supabase
    .from("content_strategies")
    .insert({
      client_id: customerId,
      telegram_id: telegramId,
      content_pillars: strategy.content_pillars,
      posting_schedule: strategy.posting_schedule,
      platform_strategy: Object.entries(strategy.posting_schedule?.frequency_by_platform || {}).map(([platform, freq]) => ({
        platform,
        frequency: freq
      })),
      content_mix: { themes: strategy.content_themes },
      example_week: strategy.content_calendar_example,
      hashtag_bank: [],
      growth_strategy: strategy.engagement_strategy,
      key_tips: [],
      generated_at: new Date().toISOString()
    })
  
  if (strategyError) {
    console.error("  Error saving content strategy:", strategyError)
  } else {
    console.log("  Content strategy saved")
  }
  
  // Save Audience Analysis
  const { error: audienceError } = await supabase
    .from("audience_analyses")
    .insert({
      client_id: customerId,
      telegram_id: telegramId,
      overview: audience.primary_audience?.demographics,
      primary_platforms: [],
      core_positioning: audience.primary_audience?.psychographics,
      audience_psychology: audience.audience_journey?.awareness_stage,
      audience_segments: audience.secondary_audiences,
      platform_breakdown: [],
      audience_motivations: audience.engagement_triggers,
      content_types_that_attract: audience.content_preferences,
      personality_types: [],
      audience_flywheel: audience.audience_journey?.decision_stage,
      generated_at: new Date().toISOString()
    })
  
  if (audienceError) {
    console.error("  Error saving audience analysis:", audienceError)
  }
  
  console.log("  Database save complete")
  return customerId
}

// ============================================================================
// TELEGRAM DELIVERY
// ============================================================================

async function sendPDFsViaTelegram(
  telegramId: number,
  businessName: string,
  blueprintPDF: Buffer,
  strategyPDF: Buffer,
  audiencePDF: Buffer
) {
  console.log(`  Sending PDFs via Telegram to ${telegramId}...`)
  
  // Send intro message
  await bot.sendMessage(
    telegramId,
    `*Your Strategy Documents Are Ready!*\n\nI've regenerated your complete strategy package with our latest frameworks. You'll receive 3 professional PDF documents:\n\n1. Brand Identity Blueprint\n2. Content Strategy\n3. Target Audience Analysis\n\nSending them now...`,
    { parse_mode: "Markdown" }
  )
  
  await new Promise(r => setTimeout(r, 1000))
  
  // Send Brand Blueprint PDF
  await bot.sendDocument(telegramId, blueprintPDF, {
    caption: `Brand Identity Blueprint - ${businessName}`
  }, {
    filename: `${businessName.replace(/\s+/g, "_")}_Brand_Blueprint.pdf`,
    contentType: "application/pdf"
  })
  
  await new Promise(r => setTimeout(r, 500))
  
  // Send Content Strategy PDF
  await bot.sendDocument(telegramId, strategyPDF, {
    caption: `Content Strategy - ${businessName}`
  }, {
    filename: `${businessName.replace(/\s+/g, "_")}_Content_Strategy.pdf`,
    contentType: "application/pdf"
  })
  
  await new Promise(r => setTimeout(r, 500))
  
  // Send Audience Analysis PDF
  await bot.sendDocument(telegramId, audiencePDF, {
    caption: `Target Audience Analysis - ${businessName}`
  }, {
    filename: `${businessName.replace(/\s+/g, "_")}_Audience_Analysis.pdf`,
    contentType: "application/pdf"
  })
  
  await new Promise(r => setTimeout(r, 500))
  
  // Send completion message
  await bot.sendMessage(
    telegramId,
    `*All documents sent!*\n\nYour complete strategy package includes:\n- Brand Identity Blueprint\n- Content Strategy with Example Week\n- Target Audience Analysis\n\nThese documents are also saved to your dashboard at jahknowspr.com. Log in with your email to view them anytime.\n\nThank you for choosing JahKnowsPR!`,
    { parse_mode: "Markdown" }
  )
  
  console.log("  PDFs sent successfully")
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log("=" .repeat(60))
  console.log("KORA Strategy Regeneration with PDF Output")
  console.log("=" .repeat(60))
  console.log("")
  
  for (const user of TARGET_USERS) {
    console.log(`\nProcessing: ${user.name} (${user.telegramId})`)
    console.log("-".repeat(40))
    
    // Fetch intake session
    const { data: session, error: sessionError } = await supabase
      .from("telegram_intake_sessions")
      .select("*")
      .eq("telegram_id", user.telegramId)
      .single()
    
    if (sessionError || !session) {
      console.log(`  No intake session found for ${user.name}`)
      console.log(`  Creating sample session for testing...`)
      
      // For testing, we'll create sample responses if none exist
      const sampleResponses: Record<string, string> = {
        business_name: user.name === "Juss" ? "Justice Vaughn Consulting" : "Jocelyn Caviness Consulting",
        business_type: "Professional Services / Consulting",
        mission: "To empower businesses and individuals with strategic insights and innovative solutions",
        vision: "To be the leading voice in strategic consulting and brand development",
        core_values: "Integrity, Innovation, Excellence, Collaboration, Growth",
        brand_personality: "Professional yet approachable, innovative, trustworthy, results-driven",
        brand_voice: "Confident, clear, inspiring, and actionable",
        unique_value: "Combining data-driven strategy with creative storytelling to deliver measurable results",
        expertise_areas: "Brand strategy, content marketing, digital transformation, audience engagement",
        content_pillars: "Industry insights, case studies, how-to guides, thought leadership",
        audience_age: "25-45 year old professionals and business owners",
        audience_pain_points: "Struggling to stand out, unclear messaging, inconsistent content, limited reach",
        audience_desires: "Growth, recognition, clear direction, measurable results"
      }
      
      // Use sample responses
      const intakeResponses = sampleResponses
      const businessName = intakeResponses.business_name
      
      try {
        // Generate documents
        console.log("  Generating Brand Blueprint...")
        const blueprint = await generateBrandBlueprint(intakeResponses)
        
        console.log("  Generating Content Strategy...")
        const contentStrategy = await generateContentStrategy(intakeResponses, blueprint)
        
        console.log("  Generating Audience Analysis...")
        const audienceAnalysis = await generateAudienceAnalysis(intakeResponses, blueprint)
        
        // Generate PDFs
        console.log("  Generating PDFs...")
        const blueprintPDF = generateBrandBlueprintPDF(blueprint, businessName)
        const strategyPDF = generateContentStrategyPDF(contentStrategy, businessName)
        const audiencePDF = generateAudienceAnalysisPDF(audienceAnalysis, businessName)
        
        // Save to database
        await saveToDatabase(
          user.telegramId,
          businessName,
          blueprint,
          contentStrategy,
          audienceAnalysis,
          user.email
        )
        
        // Send via Telegram
        await sendPDFsViaTelegram(
          user.telegramId,
          businessName,
          blueprintPDF,
          strategyPDF,
          audiencePDF
        )
        
        console.log(`  Complete for ${user.name}`)
        
      } catch (error) {
        console.error(`  Error processing ${user.name}:`, error)
      }
      
      continue
    }
    
    // Process existing session
    const responses = session.responses || {}
    const businessName = responses.business_name || user.name
    
    if (Object.keys(responses).length < 3) {
      console.log(`  Insufficient responses (${Object.keys(responses).length} found)`)
      continue
    }
    
    try {
      // Generate documents
      console.log("  Generating Brand Blueprint...")
      const blueprint = await generateBrandBlueprint(responses)
      
      console.log("  Generating Content Strategy...")
      const contentStrategy = await generateContentStrategy(responses, blueprint)
      
      console.log("  Generating Audience Analysis...")
      const audienceAnalysis = await generateAudienceAnalysis(responses, blueprint)
      
      // Generate PDFs
      console.log("  Generating PDFs...")
      const blueprintPDF = generateBrandBlueprintPDF(blueprint, businessName)
      const strategyPDF = generateContentStrategyPDF(contentStrategy, businessName)
      const audiencePDF = generateAudienceAnalysisPDF(audienceAnalysis, businessName)
      
      // Save to database
      await saveToDatabase(
        user.telegramId,
        businessName,
        blueprint,
        contentStrategy,
        audienceAnalysis,
        user.email
      )
      
      // Send via Telegram
      await sendPDFsViaTelegram(
        user.telegramId,
        businessName,
        blueprintPDF,
        strategyPDF,
        audiencePDF
      )
      
      console.log(`  Complete for ${user.name}`)
      
    } catch (error) {
      console.error(`  Error processing ${user.name}:`, error)
      
      try {
        await bot.sendMessage(
          user.telegramId,
          `I encountered an error regenerating your strategy documents. Please try again later or contact support.`,
          { parse_mode: "Markdown" }
        )
      } catch (e) {
        console.error("  Couldn't send error message")
      }
    }
  }
  
  console.log("\n" + "=".repeat(60))
  console.log("Regeneration complete!")
  console.log("=".repeat(60))
}

main().catch(console.error)
