import { createClient } from "@supabase/supabase-js"
import TelegramBot from "node-telegram-bot-api"
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })

interface IntakeSession {
  telegram_id: number
  telegram_username: string | null
  current_question_id: string | null
  phase: string
  responses: Record<string, string>
  started_at: string
  last_activity: string
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

async function generateBrandBlueprint(responses: Record<string, string>): Promise<BrandBlueprint> {
  const prompt = `You are a professional brand strategist. Based on the following intake responses, create a comprehensive Brand Identity Blueprint.

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
  const prompt = `You are a content strategy expert. Based on the intake responses and brand blueprint, create a comprehensive Content Strategy.

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
  const prompt = `You are an audience research specialist. Based on the intake responses and brand blueprint, create a comprehensive Target Audience Analysis.

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

function formatBrandBlueprintForTelegram(blueprint: BrandBlueprint): string {
  let msg = `🎨 *BRAND IDENTITY BLUEPRINT*\n\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  msg += `*Brand Essence*\n${blueprint.brand_essence}\n\n`
  msg += `*Mission Statement*\n${blueprint.mission_statement}\n\n`
  msg += `*Vision Statement*\n${blueprint.vision_statement}\n\n`
  msg += `*Core Values*\n`
  blueprint.core_values?.forEach(v => { msg += `• ${v}\n` })
  msg += `\n*Brand Personality*\n${blueprint.brand_personality}\n\n`
  msg += `*Unique Value Proposition*\n${blueprint.unique_value_proposition}\n\n`
  msg += `*Brand Voice*\n`
  msg += `• Tone: ${blueprint.brand_voice?.tone}\n`
  msg += `• Style: ${blueprint.brand_voice?.language_style}\n`
  return msg
}

function formatContentStrategyForTelegram(strategy: ContentStrategy): string {
  let msg = `📝 *CONTENT STRATEGY*\n\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  msg += `*Content Pillars*\n`
  strategy.content_pillars?.forEach(p => {
    msg += `\n📌 *${p.pillar_name}*\n${p.description}\n`
    msg += `Frequency: ${p.posting_frequency}\n`
  })
  msg += `\n*Content Themes*\n`
  strategy.content_themes?.forEach(t => { msg += `• ${t}\n` })
  msg += `\n*Engagement Strategy*\n${strategy.engagement_strategy}\n\n`
  msg += `*Example Week*\n`
  strategy.content_calendar_example?.forEach(day => {
    msg += `• ${day.day}: ${day.content_type} - "${day.topic}" (${day.platform})\n`
  })
  return msg
}

function formatAudienceAnalysisForTelegram(analysis: AudienceAnalysis): string {
  let msg = `👥 *TARGET AUDIENCE ANALYSIS*\n\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  msg += `*Primary Audience*\n`
  msg += `Demographics: ${analysis.primary_audience?.demographics}\n`
  msg += `Psychographics: ${analysis.primary_audience?.psychographics}\n\n`
  msg += `*Pain Points*\n`
  analysis.primary_audience?.pain_points?.forEach(p => { msg += `• ${p}\n` })
  msg += `\n*Aspirations*\n`
  analysis.primary_audience?.aspirations?.forEach(a => { msg += `• ${a}\n` })
  msg += `\n*Engagement Triggers*\n`
  analysis.engagement_triggers?.forEach(t => { msg += `• ${t}\n` })
  msg += `\n*Content Preferences*\n`
  analysis.content_preferences?.forEach(p => { msg += `• ${p}\n` })
  return msg
}

async function main() {
  console.log("🔍 Fetching pending intake sessions...")

  const { data: sessions, error } = await supabase
    .from("telegram_intake_sessions")
    .select("*")
    .neq("phase", "completed")

  if (error) {
    console.error("Error fetching sessions:", error)
    return
  }

  if (!sessions || sessions.length === 0) {
    console.log("No pending sessions found")
    return
  }

  console.log(`Found ${sessions.length} pending sessions`)

  for (const session of sessions as IntakeSession[]) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Processing: ${session.telegram_username || session.telegram_id}`)
    console.log(`Responses: ${Object.keys(session.responses || {}).length} answers`)

    if (Object.keys(session.responses || {}).length < 5) {
      console.log(`⚠️ Skipping - insufficient responses`)
      continue
    }

    try {
      console.log(`🎨 Generating Brand Blueprint...`)
      const blueprint = await generateBrandBlueprint(session.responses)
      
      console.log(`📝 Generating Content Strategy...`)
      const contentStrategy = await generateContentStrategy(session.responses, blueprint)
      
      console.log(`👥 Generating Audience Analysis...`)
      const audienceAnalysis = await generateAudienceAnalysis(session.responses, blueprint)

      const businessName = session.responses.business_name || `User ${session.telegram_id}`
      const clientId = businessName.toLowerCase().replace(/\s+/g, "-")

      console.log(`💾 Saving to database for client: ${clientId}`)

      const { data: existingClient } = await supabase
        .from("customers")
        .select("id")
        .eq("id", clientId)
        .single()

      if (!existingClient) {
        await supabase.from("customers").insert({
          id: clientId,
          business_name: businessName,
          telegram_id: session.telegram_id,
          client_status: "active",
          onboarding_status: "intake_complete",
          created_at: new Date().toISOString()
        })
      }

      await supabase.from("brand_blueprints").upsert({
        client_id: clientId,
        telegram_id: session.telegram_id,
        ...blueprint,
        generated_at: new Date().toISOString()
      })

      await supabase.from("content_strategies").upsert({
        client_id: clientId,
        telegram_id: session.telegram_id,
        ...contentStrategy,
        generated_at: new Date().toISOString()
      })

      await supabase.from("audience_analyses").upsert({
        client_id: clientId,
        telegram_id: session.telegram_id,
        ...audienceAnalysis,
        generated_at: new Date().toISOString()
      })

      await supabase
        .from("telegram_intake_sessions")
        .update({ phase: "completed" })
        .eq("telegram_id", session.telegram_id)

      console.log(`📤 Sending documents via Telegram...`)

      await bot.sendMessage(session.telegram_id,
        `✅ *Your strategy documents are ready!*\n\nI'll send them to you now in three parts.`,
        { parse_mode: "Markdown" }
      )

      await new Promise(r => setTimeout(r, 500))
      await bot.sendMessage(session.telegram_id, formatBrandBlueprintForTelegram(blueprint), { parse_mode: "Markdown" })

      await new Promise(r => setTimeout(r, 500))
      await bot.sendMessage(session.telegram_id, formatContentStrategyForTelegram(contentStrategy), { parse_mode: "Markdown" })

      await new Promise(r => setTimeout(r, 500))
      await bot.sendMessage(session.telegram_id, formatAudienceAnalysisForTelegram(audienceAnalysis), { parse_mode: "Markdown" })

      await bot.sendMessage(session.telegram_id,
        `🎉 *That's everything!*\n\nYour complete strategy package includes:\n✅ Brand Identity Blueprint\n✅ Content Strategy with Example Week\n✅ Target Audience Analysis\n\nThese documents are now saved to your profile. You can access them anytime through the KORA dashboard.\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n*What's Next?*\n\n1. Review your strategy documents\n2. Start creating content based on your pillars\n3. Follow your example week schedule\n4. Track your progress in KORA\n\nThank you for trusting KORA! 🚀`,
        { parse_mode: "Markdown" }
      )

      console.log(`✅ Complete for ${session.telegram_username || session.telegram_id}`)

    } catch (error) {
      console.error(`❌ Error processing ${session.telegram_username}:`, error)

      try {
        await bot.sendMessage(session.telegram_id,
          `❌ I encountered an error generating your strategy.\n\nPlease type /restart to try again.`,
          { parse_mode: "Markdown" }
        )
      } catch (e) {
        console.error("Couldn't send error message to user")
      }
    }
  }

  console.log("\n🏁 Done processing all pending sessions")
}

main()
