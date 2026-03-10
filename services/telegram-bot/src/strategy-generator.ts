import OpenAI from "openai"
import type { 
  GeneratedStrategy, 
  BrandBlueprint, 
  ContentStrategy, 
  AudienceAnalysis,
  UserSession 
} from "./types.js"

let openai: OpenAI | null = null

export function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn("OpenAI API key not found")
    return null
  }
  openai = new OpenAI({ apiKey })
  return openai
}

export async function generateFullStrategy(
  session: UserSession
): Promise<GeneratedStrategy | null> {
  if (!openai) {
    console.error("OpenAI not initialized")
    return null
  }

  const responses = session.responses

  console.log("Generating Brand Blueprint...")
  const brandBlueprint = await generateBrandBlueprint(responses)

  console.log("Generating Content Strategy...")
  const contentStrategy = await generateContentStrategy(responses, brandBlueprint)

  console.log("Generating Audience Analysis...")
  const audienceAnalysis = await generateAudienceAnalysis(responses, brandBlueprint)

  const clientId = responses.business_name?.toLowerCase().replace(/\s+/g, "-") || `user-${session.telegram_id}`

  return {
    client_id: clientId,
    telegram_id: session.telegram_id,
    brand_blueprint: brandBlueprint,
    content_strategy: contentStrategy,
    audience_analysis: audienceAnalysis,
    generated_at: new Date().toISOString()
  }
}

async function generateBrandBlueprint(responses: Record<string, string>): Promise<BrandBlueprint> {
  const prompt = `You are a professional brand strategist. Based on the following intake responses, create a comprehensive Brand Identity Blueprint.

INTAKE RESPONSES:
- Full Name: ${responses.welcome || "Not provided"}
- Business Name: ${responses.business_name || "Not provided"}
- Business Type: ${responses.business_type || "Not provided"}
- Website: ${responses.website || "None"}
- Social Handles: ${responses.social_handles || "Not provided"}
- Brand Story: ${responses.brand_story || "Not provided"}
- Mission: ${responses.mission || "Not provided"}
- Vision: ${responses.vision || "Not provided"}
- Core Values: ${responses.core_values || "Not provided"}
- Unique Value: ${responses.unique_value || "Not provided"}
- Brand Personality: ${responses.brand_personality || "Not provided"}
- Brand Voice: ${responses.brand_voice || "Not provided"}
- What to Avoid: ${responses.avoid_perception || "Not provided"}

Generate a professional Brand Identity Blueprint as a JSON object with the following structure:
{
  "business_name": "string",
  "business_type": "string",
  "mission": "A refined, powerful mission statement",
  "vision": "A compelling vision statement",
  "core_values": [
    { "value": "Value name", "explanation": "Why this matters" }
  ],
  "unique_value_proposition": "A clear, compelling UVP",
  "brand_personality": ["trait1", "trait2", "trait3"],
  "brand_voice": "Detailed description of how the brand should communicate",
  "avoid_perceptions": ["thing1", "thing2"],
  "brand_story": "A refined, engaging brand origin story",
  "positioning_statement": "A professional positioning statement: For [target audience], [Brand] is the [category] that [key benefit] because [reason to believe]"
}

Make it professional, clear, and actionable. Return ONLY the JSON object, no additional text.`

  const completion = await openai!.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" }
  })

  const content = completion.choices[0]?.message?.content || "{}"
  return JSON.parse(content) as BrandBlueprint
}

async function generateContentStrategy(
  responses: Record<string, string>,
  brandBlueprint: BrandBlueprint
): Promise<ContentStrategy> {
  const prompt = `You are a professional content strategist. Based on the following information, create a comprehensive Content Strategy document.

BRAND INFO:
- Business Name: ${brandBlueprint.business_name}
- Business Type: ${brandBlueprint.business_type}
- Brand Voice: ${brandBlueprint.brand_voice}
- Positioning: ${brandBlueprint.positioning_statement}

CONTENT INTAKE:
- Topics of Passion: ${responses.content_intro || "Not provided"}
- Expertise Areas: ${responses.expertise_areas || "Not provided"}
- Suggested Content Pillars: ${responses.content_pillars || "Not provided"}
- Preferred Formats: ${responses.content_formats || "Not provided"}
- Posting Frequency: ${responses.posting_frequency || "Not provided"}
- Primary Platform: ${responses.primary_platform || "Not provided"}
- Content Goals: ${responses.content_goals || "Not provided"}
- Inspiration/Competitors: ${responses.competitor_inspiration || "Not provided"}

Generate a professional Content Strategy as a JSON object:
{
  "content_pillars": [
    {
      "name": "Pillar name",
      "purpose": "What this pillar achieves (e.g., 'builds authority', 'builds connection')",
      "examples": ["Topic example 1", "Topic example 2", "Topic example 3"],
      "percentage": 30
    }
  ],
  "posting_schedule": {
    "frequency": "X times per week",
    "recommended_times": ["Best time 1", "Best time 2"],
    "consistency_tips": ["Tip 1", "Tip 2"]
  },
  "platform_strategy": [
    {
      "platform": "Platform name",
      "priority": "primary|secondary|experimental",
      "content_style": "How content should look/feel on this platform",
      "audience_behavior": "How the audience behaves here",
      "best_practices": ["Practice 1", "Practice 2"]
    }
  ],
  "content_mix": {
    "educational": 40,
    "relatable": 30,
    "commentary": 20,
    "promotional": 10
  },
  "example_week": [
    {
      "day": "Monday",
      "content_type": "Educational",
      "topic_idea": "Specific topic idea",
      "pillar": "Pillar name"
    }
  ],
  "hashtag_bank": ["#relevant", "#hashtags"],
  "growth_strategy": "Overall strategy for growth",
  "key_tips": ["Important tip 1", "Important tip 2", "Important tip 3"]
}

Create a full week (7 days) of example content. Make the content pillars specific to their business. Return ONLY the JSON object.`

  const completion = await openai!.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" }
  })

  const content = completion.choices[0]?.message?.content || "{}"
  return JSON.parse(content) as ContentStrategy
}

async function generateAudienceAnalysis(
  responses: Record<string, string>,
  brandBlueprint: BrandBlueprint
): Promise<AudienceAnalysis> {
  const prompt = `You are a professional audience researcher. Based on the following information, create a comprehensive Target Audience Analysis.

BRAND INFO:
- Business Name: ${brandBlueprint.business_name}
- Business Type: ${brandBlueprint.business_type}
- Positioning: ${brandBlueprint.positioning_statement}
- UVP: ${brandBlueprint.unique_value_proposition}

AUDIENCE INTAKE:
- Ideal Follower Description: ${responses.audience_intro || "Not provided"}
- Target Age Range: ${responses.audience_age || "Not provided"}
- Pain Points: ${responses.audience_pain_points || "Not provided"}
- Desires/Transformations: ${responses.audience_desires || "Not provided"}
- Objections: ${responses.audience_objections || "Not provided"}
- Audience Platforms: ${responses.audience_platforms || "Not provided"}
- Audience Segments: ${responses.audience_segments || "Not provided"}
- Primary CTA: ${responses.call_to_action || "Not provided"}
- Additional Context: ${responses.additional_context || "Not provided"}

CONTENT INTELLIGENCE PREFERENCES:
- Topics to Track: ${responses.topics_to_track || "Not provided"}
- Preferred Content Formats: ${responses.content_consumption || "Not provided"}
- Thought Leaders/Publications Followed: ${responses.thought_leaders || "Not provided"}
- Content They Want to Create: ${responses.content_to_create || "Not provided"}
- Topics to Avoid: ${responses.topics_to_avoid || "None specified"}

Generate a professional Target Audience Analysis as a JSON object:
{
  "overview": "High-level overview of the audience strategy",
  "primary_platforms": ["Platform 1", "Platform 2"],
  "core_positioning": "How the brand should be perceived by this audience",
  "audience_psychology": "What drives this audience's behavior",
  "audience_segments": [
    {
      "name": "Segment name (e.g., 'Emerging Creators')",
      "age_range": "19-30",
      "examples": ["podcasters", "TikTok creators", "YouTubers"],
      "pain_point": "Their main struggle",
      "why_they_follow": "What they get from following"
    }
  ],
  "platform_breakdown": [
    {
      "platform": "TikTok",
      "age_range": "19-30",
      "audience_description": "Who's on this platform",
      "what_they_want": "What content they seek",
      "content_style": "How to present content here"
    }
  ],
  "audience_motivations": [
    "Key motivation 1",
    "Key motivation 2",
    "Key motivation 3"
  ],
  "content_types_that_attract": [
    {
      "type": "Education",
      "examples": ["Example topic 1", "Example topic 2"]
    }
  ],
  "personality_types": [
    {
      "name": "Persona name (e.g., 'Future Publicist')",
      "age_range": "18-28",
      "platforms": ["TikTok", "YouTube Shorts"],
      "what_they_want": "What they're looking for"
    }
  ],
  "audience_flywheel": "How different platforms feed into each other and build authority"
}

Create at least 3 audience segments and 5 personality types. Make it specific to their business. Return ONLY the JSON object.`

  const completion = await openai!.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" }
  })

  const content = completion.choices[0]?.message?.content || "{}"
  return JSON.parse(content) as AudienceAnalysis
}

export function formatBrandBlueprintForTelegram(blueprint: BrandBlueprint): string {
  const values = blueprint.core_values
    .map((v) => `• ${v.value} — ${v.explanation}`)
    .join("\n")

  return `🎨 *BRAND IDENTITY BLUEPRINT*
━━━━━━━━━━━━━━━━━━━━━━

*${blueprint.business_name}*
${blueprint.business_type}

━━━━━━━━━━━━━━━━━━━━━━

📍 *POSITIONING STATEMENT*
${blueprint.positioning_statement}

━━━━━━━━━━━━━━━━━━━━━━

🎯 *MISSION*
${blueprint.mission}

🔭 *VISION*
${blueprint.vision}

━━━━━━━━━━━━━━━━━━━━━━

💎 *CORE VALUES*
${values}

━━━━━━━━━━━━━━━━━━━━━━

⚡ *UNIQUE VALUE PROPOSITION*
${blueprint.unique_value_proposition}

━━━━━━━━━━━━━━━━━━━━━━

🗣 *BRAND VOICE*
${blueprint.brand_voice}

Personality: ${blueprint.brand_personality.join(", ")}

━━━━━━━━━━━━━━━━━━━━━━

📖 *BRAND STORY*
${blueprint.brand_story}

━━━━━━━━━━━━━━━━━━━━━━

🚫 *AVOID BEING PERCEIVED AS*
${blueprint.avoid_perceptions.map((p) => `• ${p}`).join("\n")}
`
}

export function formatContentStrategyForTelegram(strategy: ContentStrategy): string {
  const pillars = strategy.content_pillars
    .map((p) => `*${p.name}* (${p.percentage}%)\n${p.purpose}\nExamples:\n${p.examples.map((e) => `  • ${e}`).join("\n")}`)
    .join("\n\n")

  const exampleWeek = strategy.example_week
    .map((e) => `*${e.day}*: ${e.content_type}\n${e.topic_idea}`)
    .join("\n\n")

  return `📝 *CONTENT STRATEGY*
━━━━━━━━━━━━━━━━━━━━━━

🏛 *CONTENT PILLARS*

${pillars}

━━━━━━━━━━━━━━━━━━━━━━

📊 *CONTENT MIX*
• Educational: ${strategy.content_mix.educational}%
• Relatable: ${strategy.content_mix.relatable}%
• Commentary: ${strategy.content_mix.commentary}%
• Promotional: ${strategy.content_mix.promotional}%

━━━━━━━━━━━━━━━━━━━━━━

📅 *POSTING SCHEDULE*
${strategy.posting_schedule.frequency}

Best times: ${strategy.posting_schedule.recommended_times.join(", ")}

Tips:
${strategy.posting_schedule.consistency_tips.map((t) => `• ${t}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━

📋 *EXAMPLE WEEK*

${exampleWeek}

━━━━━━━━━━━━━━━━━━━━━━

#️⃣ *HASHTAG BANK*
${strategy.hashtag_bank.join(" ")}

━━━━━━━━━━━━━━━━━━━━━━

🚀 *GROWTH STRATEGY*
${strategy.growth_strategy}

━━━━━━━━━━━━━━━━━━━━━━

💡 *KEY TIPS*
${strategy.key_tips.map((t) => `• ${t}`).join("\n")}
`
}

export function formatAudienceAnalysisForTelegram(analysis: AudienceAnalysis): string {
  const segments = analysis.audience_segments
    .map((s) => `*${s.name}*\nAge: ${s.age_range}\nExamples: ${s.examples.join(", ")}\nPain Point: ${s.pain_point}\nWhy they follow: ${s.why_they_follow}`)
    .join("\n\n")

  const personalities = analysis.personality_types
    .map((p) => `*${p.name}*\nAge: ${p.age_range}\nPlatforms: ${p.platforms.join(", ")}\nSeeks: ${p.what_they_want}`)
    .join("\n\n")

  return `👥 *TARGET AUDIENCE ANALYSIS*
━━━━━━━━━━━━━━━━━━━━━━

📍 *OVERVIEW*
${analysis.overview}

Core Positioning: ${analysis.core_positioning}

━━━━━━━━━━━━━━━━━━━━━━

🧠 *AUDIENCE PSYCHOLOGY*
${analysis.audience_psychology}

━━━━━━━━━━━━━━━━━━━━━━

👤 *AUDIENCE SEGMENTS*

${segments}

━━━━━━━━━━━━━━━━━━━━━━

🎭 *PERSONALITY TYPES*

${personalities}

━━━━━━━━━━━━━━━━━━━━━━

💫 *AUDIENCE MOTIVATIONS*
${analysis.audience_motivations.map((m) => `• ${m}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━

🔄 *AUDIENCE FLYWHEEL*
${analysis.audience_flywheel}

━━━━━━━━━━━━━━━━━━━━━━

📱 *PRIMARY PLATFORMS*
${analysis.primary_platforms.join(", ")}
`
}
