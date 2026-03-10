/**
 * Content Draft Agent
 * 
 * Generates full ready-to-post content for 3-day or 5-day strategies.
 * Creates platform-specific content with captions, hashtags, and visual suggestions.
 */

import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent.js"
import type { AgentOutput } from "../types/pipeline.js"
import { createClient } from "@supabase/supabase-js"
import { getRouter } from "../llm/router.js"
import type { ContentPreferences } from "./insight-report.js"

// Types
export interface ContentDraftInput {
  tenantId: string
  telegramId: number
  strategyType: "3day" | "5day"
  preferences?: ContentPreferences
  recentInsights?: any // From InsightReportAgent
  startDate?: Date
}

export interface PlatformPost {
  platform: string
  postType: "image" | "carousel" | "reel" | "video" | "story" | "text"
  caption: string
  hashtags: string[]
  visualDescription: string
  bestPostingTime: string
  callToAction: string
  hookLine?: string
  scriptOutline?: string[]
}

export interface DayContent {
  dayNumber: number
  date: string
  dayOfWeek: string
  theme: string
  themeDescription: string
  posts: PlatformPost[]
}

export interface ContentDraftOutput {
  strategyType: "3day" | "5day"
  startDate: Date
  themeOverview: string
  contentPillarsUsed: string[]
  dailyContent: DayContent[]
  confidenceScore: number
  formattedMessages: string[]
}

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export class ContentDraftAgent extends BaseIntelAgent<ContentDraftInput, ContentDraftOutput> {
  constructor() {
    super("ContentDraftAgent", "generation")
  }

  protected async execute(
    context: any,
    input: ContentDraftInput
  ): Promise<AgentOutput<ContentDraftOutput>> {
    console.log(`[ContentDraftAgent] Generating ${input.strategyType} content strategy for tenant ${input.tenantId}`)

    try {
      // Step 1: Load preferences
      await this.reportStepStart("Loading content preferences")
      const preferences = input.preferences || await this.loadPreferences(input.tenantId)
      await this.reportStepComplete("Loading content preferences")

      // Step 2: Load brand context
      await this.reportStepStart("Loading brand context")
      const brandContext = await this.loadBrandContext(input.tenantId)
      await this.reportStepComplete("Loading brand context")

      // Step 3: Load recent insights if available
      await this.reportStepStart("Loading recent insights")
      const recentInsights = input.recentInsights || await this.loadRecentInsights(input.tenantId)
      await this.reportStepComplete("Loading recent insights")

      // Step 4: Generate themes for each day
      const numDays = input.strategyType === "3day" ? 3 : 5
      await this.reportStepStart(`Planning ${numDays}-day content themes`)
      const themes = await this.generateThemes(numDays, preferences, brandContext, recentInsights)
      await this.reportStepComplete(`Planning ${numDays}-day content themes`)

      // Step 5: Generate content for each day
      const dailyContent: DayContent[] = []
      const startDate = input.startDate || new Date()

      for (let i = 0; i < numDays; i++) {
        await this.reportStepStart(`Generating Day ${i + 1} content`)
        
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        const dayContent = await this.generateDayContent(
          i + 1,
          date,
          themes[i],
          preferences,
          brandContext,
          recentInsights
        )
        
        dailyContent.push(dayContent)
        await this.reportStepComplete(`Generating Day ${i + 1} content`)
      }

      // Step 6: Format for Telegram
      await this.reportStepStart("Formatting content for delivery")
      const formattedMessages = this.formatForTelegram(dailyContent, preferences)
      await this.reportStepComplete("Formatting content for delivery")

      // Calculate quality
      const confidenceScore = this.calculateConfidenceScore(dailyContent)

      const output: ContentDraftOutput = {
        strategyType: input.strategyType,
        startDate,
        themeOverview: this.generateThemeOverview(themes, preferences),
        contentPillarsUsed: this.extractPillars(themes),
        dailyContent,
        confidenceScore,
        formattedMessages
      }

      // Save to database
      await this.saveDraft(input.tenantId, output)

      return createAgentOutput(true, output, "delivery")

    } catch (error: any) {
      console.error(`[ContentDraftAgent] Error:`, error)
      return createAgentOutput(false, undefined, undefined, error.message)
    }
  }

  private async loadPreferences(tenantId: string): Promise<ContentPreferences> {
    const { data, error } = await supabase
      .from("intel_content_preferences")
      .select("*")
      .eq("tenant_id", tenantId)
      .single()

    if (error || !data) {
      return {
        primaryUseCase: "general",
        platformPriority: ["instagram", "linkedin"],
        contentTone: "professional",
        focusTopics: ["industry trends", "marketing"],
        industryFocus: ["marketing"]
      }
    }

    return {
      primaryUseCase: data.primary_use_case,
      platformPriority: data.platform_priority || [],
      contentTone: data.content_tone,
      focusTopics: data.focus_topics || [],
      industryFocus: data.industry_focus || [],
      podcastName: data.podcast_name,
      podcastThemes: data.podcast_themes || []
    }
  }

  private async loadBrandContext(tenantId: string): Promise<any> {
    // Load brand blueprint
    const { data: blueprint } = await supabase
      .from("brand_blueprints")
      .select("*")
      .eq("client_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Load audience analysis
    const { data: audience } = await supabase
      .from("audience_analyses")
      .select("*")
      .eq("client_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Load content strategy
    const { data: strategy } = await supabase
      .from("content_strategies")
      .select("*")
      .eq("client_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    return {
      blueprint: blueprint || null,
      audience: audience || null,
      strategy: strategy || null
    }
  }

  private async loadRecentInsights(tenantId: string): Promise<any> {
    const { data } = await supabase
      .from("intel_insight_reports")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("report_date", { ascending: false })
      .limit(3)

    return data || []
  }

  private async generateThemes(
    numDays: number,
    preferences: ContentPreferences,
    brandContext: any,
    recentInsights: any[]
  ): Promise<{ theme: string; description: string; pillar: string }[]> {
    const themes: { theme: string; description: string; pillar: string }[] = []

    // Define content pillars based on use case
    const pillars = this.getContentPillars(preferences)

    // Distribute pillars across days
    for (let i = 0; i < numDays; i++) {
      const pillar = pillars[i % pillars.length]
      themes.push({
        theme: this.generateDayTheme(i + 1, pillar, preferences, recentInsights),
        description: this.getThemeDescription(pillar, preferences),
        pillar
      })
    }

    return themes
  }

  private getContentPillars(preferences: ContentPreferences): string[] {
    if (preferences.primaryUseCase === "pr_industry") {
      return [
        "Industry Intelligence",
        "Client Success Stories",
        "Thought Leadership",
        "Behind the Scenes",
        "Educational Tips"
      ]
    }

    if (preferences.primaryUseCase === "podcast_creator") {
      return [
        "Tutorial/How-To",
        "Behind the Scenes",
        "Industry Commentary",
        "Gear/Tool Reviews",
        "Personal Journey"
      ]
    }

    return [
      "Educational",
      "Inspirational",
      "Behind the Scenes",
      "Promotional",
      "Community Engagement"
    ]
  }

  private generateDayTheme(
    dayNum: number,
    pillar: string,
    preferences: ContentPreferences,
    recentInsights: any[]
  ): string {
    // Use recent insights to make themes timely
    const insightTopics = recentInsights
      .flatMap(i => i.trending_topics || [])
      .map((t: any) => t.topic)
      .slice(0, 3)

    if (preferences.primaryUseCase === "podcast_creator") {
      const themes: Record<string, string[]> = {
        "Tutorial/How-To": [
          "Quick Editing Hack",
          "Lighting Setup 101",
          "Audio Quality Secrets",
          "Color Grading Tips",
          "Workflow Optimization"
        ],
        "Behind the Scenes": [
          "Day in My Life",
          "Studio Tour",
          "My Setup Evolution",
          "Filming Process Revealed",
          "Mistakes I Made"
        ],
        "Industry Commentary": [
          "What I Think About...",
          "Trend Analysis",
          "Platform Update Reaction",
          "Creator Economy News",
          "Hot Takes"
        ],
        "Gear/Tool Reviews": [
          "New Gear Test",
          "Tool Comparison",
          "Budget vs Pro",
          "AI Tool Review",
          "Must-Have Apps"
        ],
        "Personal Journey": [
          "My Story",
          "Lessons Learned",
          "Monthly Reflection",
          "Goals Update",
          "Wins & Challenges"
        ]
      }
      return themes[pillar]?.[dayNum % (themes[pillar]?.length || 1)] || pillar
    }

    if (preferences.primaryUseCase === "pr_industry") {
      const themes: Record<string, string[]> = {
        "Industry Intelligence": [
          "Weekly Industry Roundup",
          "Trend Alert",
          "Campaign Spotlight",
          "Platform Update Brief",
          "Data-Driven Insight"
        ],
        "Client Success Stories": [
          "Case Study",
          "Results Highlight",
          "Before/After",
          "Strategy Deep Dive",
          "Client Testimonial"
        ],
        "Thought Leadership": [
          "Industry Prediction",
          "Contrarian Take",
          "Framework Share",
          "Expert Interview",
          "Analysis Post"
        ],
        "Behind the Scenes": [
          "Team Spotlight",
          "Process Reveal",
          "Day at the Agency",
          "Culture Content",
          "Office Life"
        ],
        "Educational Tips": [
          "Quick PR Tip",
          "Common Mistakes",
          "Best Practices",
          "How-To Guide",
          "Toolkit Recommendation"
        ]
      }
      return themes[pillar]?.[dayNum % (themes[pillar]?.length || 1)] || pillar
    }

    return pillar
  }

  private getThemeDescription(pillar: string, preferences: ContentPreferences): string {
    const descriptions: Record<string, string> = {
      "Tutorial/How-To": "Share actionable knowledge your audience can implement today",
      "Behind the Scenes": "Build connection by showing the real you",
      "Industry Commentary": "Position yourself as a thought leader",
      "Gear/Tool Reviews": "Help your audience make informed decisions",
      "Personal Journey": "Inspire through authenticity and vulnerability",
      "Industry Intelligence": "Demonstrate expertise with timely insights",
      "Client Success Stories": "Build credibility through social proof",
      "Thought Leadership": "Shape industry conversations",
      "Educational Tips": "Provide value that gets saved and shared"
    }
    return descriptions[pillar] || "Create valuable content for your audience"
  }

  private async generateDayContent(
    dayNumber: number,
    date: Date,
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences,
    brandContext: any,
    recentInsights: any[]
  ): Promise<DayContent> {
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    // Generate posts for each priority platform
    const posts: PlatformPost[] = []

    for (const platform of preferences.platformPriority.slice(0, 2)) {
      const post = await this.generatePlatformPost(
        platform,
        theme,
        preferences,
        brandContext,
        dayOfWeek
      )
      posts.push(post)
    }

    return {
      dayNumber,
      date: dateStr,
      dayOfWeek,
      theme: theme.theme,
      themeDescription: theme.description,
      posts
    }
  }

  private async generatePlatformPost(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences,
    brandContext: any,
    dayOfWeek: string
  ): Promise<PlatformPost> {
    const postType = this.getOptimalPostType(platform, preferences)
    const tone = this.getToneGuidance(preferences.contentTone)
    
    // Generate caption based on theme and platform
    const caption = this.generateCaption(platform, theme, preferences, brandContext, tone)
    const hashtags = this.generateHashtags(platform, theme, preferences)
    const visual = this.generateVisualDescription(platform, postType, theme, preferences)
    const cta = this.generateCTA(platform, theme, preferences)
    const hookLine = this.generateHook(platform, theme, preferences)
    const postingTime = this.getOptimalPostingTime(platform, dayOfWeek)

    const post: PlatformPost = {
      platform,
      postType,
      caption,
      hashtags,
      visualDescription: visual,
      bestPostingTime: postingTime,
      callToAction: cta,
      hookLine
    }

    // Add script outline for video content
    if (postType === "reel" || postType === "video") {
      post.scriptOutline = this.generateScriptOutline(theme, preferences)
    }

    return post
  }

  private getOptimalPostType(platform: string, preferences: ContentPreferences): PlatformPost["postType"] {
    const typeMap: Record<string, PlatformPost["postType"]> = {
      instagram: preferences.primaryUseCase === "podcast_creator" ? "reel" : "carousel",
      tiktok: "reel",
      youtube: "video",
      linkedin: "text",
      twitter: "text"
    }
    return typeMap[platform] || "image"
  }

  private getToneGuidance(tone: string): string {
    const tones: Record<string, string> = {
      professional: "Use clear, authoritative language. Be informative but approachable.",
      casual: "Be conversational and relatable. Use everyday language.",
      creator: "Be authentic and personal. Share your perspective like talking to a friend."
    }
    return tones[tone] || tones.professional
  }

  private generateCaption(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences,
    brandContext: any,
    tone: string
  ): string {
    const brandName = brandContext?.blueprint?.business_name || "your brand"

    if (preferences.primaryUseCase === "podcast_creator") {
      return this.generateCreatorCaption(platform, theme)
    }

    if (preferences.primaryUseCase === "pr_industry") {
      return this.generatePRCaption(platform, theme, brandName)
    }

    return this.generateGeneralCaption(platform, theme, brandName)
  }

  private generateCreatorCaption(
    platform: string,
    theme: { theme: string; description: string; pillar: string }
  ): string {
    const captions: Record<string, Record<string, string>> = {
      instagram: {
        "Tutorial/How-To": `🎬 Stop what you're doing - this changed my entire workflow.\n\nI used to spend HOURS on this. Now? 10 minutes.\n\nHere's the exact process I use for ${theme.theme.toLowerCase()}:\n\n1️⃣ [Step one - the setup]\n2️⃣ [Step two - the secret sauce]\n3️⃣ [Step three - the finish]\n\nThe key most people miss? It's all in the preparation.\n\nSave this for your next project 🔖`,
        "Behind the Scenes": `POV: You're in my studio at 2am and the deadline is tomorrow.\n\nThis is what it actually looks like to create content professionally.\n\nThe glamour ✨ The stress 😅 The snacks 🍕\n\nSwipe to see the chaos behind the content →\n\nWho else can relate?`,
        "Industry Commentary": `Okay, we need to talk about what's happening in the creator space right now.\n\nMy take? [Your perspective]\n\nHere's why this matters for creators:\n\n• [Point 1]\n• [Point 2]\n• [Point 3]\n\nDrop your thoughts below - I want to hear what you think 👇`,
        "Gear/Tool Reviews": `I finally tested the [tool/gear] everyone's been asking about.\n\nHonest thoughts after using it for a week:\n\n✅ What I love:\n❌ What could be better:\n💰 Is it worth the price?\n\nFull breakdown in the caption - save this before you buy 💸`,
        "Personal Journey": `A year ago, I almost quit.\n\nHere's what changed everything...\n\n[Share vulnerable moment]\n\nThe lesson? [Key insight]\n\nIf you're in that place right now - keep going. Your breakthrough is closer than you think.\n\n💬 Drop a 🙌 if you needed to hear this`
      },
      tiktok: {
        "Tutorial/How-To": `Wait til you see this hack for ${theme.theme.toLowerCase()} 🤯\n\n#filmmaking #creatortips #editing`,
        "Behind the Scenes": `My setup at 2am vs my setup at 2pm 😭\n\n#bts #contentcreator #studiolife`,
        "Industry Commentary": `No but why is no one talking about this??\n\n#creatoreconomy #contentcreation`,
        "Gear/Tool Reviews": `Testing if this is actually worth the hype...\n\n#gearreview #techtok #creator`,
        "Personal Journey": `The moment I knew this was what I was meant to do\n\n#storytelling #creatorjourney`
      },
      youtube: {
        "Tutorial/How-To": `${theme.theme} - The Complete Guide | Everything You Need to Know\n\nIn this video, I break down exactly how to [achieve result]. Whether you're just starting out or looking to level up, this guide covers:\n\n⏱️ Timestamps:\n0:00 - Intro\n1:30 - The Foundation\n5:00 - Advanced Techniques\n10:00 - Common Mistakes\n15:00 - My Workflow\n\n📚 Resources mentioned:\n• [Resource 1]\n• [Resource 2]\n\n🔔 Subscribe for weekly tutorials!`,
        "Behind the Scenes": `A Day in the Life: How I Actually Create Content\n\nEver wonder what goes into making the videos you see on this channel? Today I'm pulling back the curtain on my entire creative process.\n\nFrom morning routine to final export, you'll see exactly how it all comes together - including the parts I usually cut out 😅\n\n📍 What you'll see:\n- Morning setup routine\n- How I plan content\n- My filming process\n- Editing workflow\n- The reality of creator life\n\n💬 Let me know in the comments what surprised you most!`,
        "Industry Commentary": `${theme.theme}: What This Means for Creators\n\nBig changes are happening in the creator space, and we need to talk about it.\n\nIn this video, I share my analysis of [topic] and what I think it means for independent creators like us.\n\n📌 Key Points:\n- What's changing\n- Why it matters\n- How to adapt\n- My predictions\n\n🤝 This isn't just my opinion - I've talked to other creators and here's the consensus...`,
        "Gear/Tool Reviews": `Is [Product] Worth It? | Honest Review After 30 Days\n\nI've been using [product] for a month now. Here's my completely honest take.\n\n📊 Review Summary:\n✅ Pros:\n❌ Cons:\n💰 Value for money:\n\nSkip to 8:45 for my final verdict!\n\n🔗 Links (no affiliate, just helpful):\n• [Product link]`,
        "Personal Journey": `What I Wish I Knew When I Started Creating Content\n\nAfter [X] years of creating content, here are the lessons that would have saved me so much time, money, and stress.\n\nThis isn't about gear or algorithms - this is the real stuff no one talks about.\n\n💭 Chapters:\n0:00 - The reality check\n3:00 - Lesson 1: [Topic]\n7:00 - Lesson 2: [Topic]\n12:00 - Lesson 3: [Topic]\n16:00 - What I'd tell my past self\n\n📣 Share this with someone who needs to hear it!`
      },
      linkedin: {
        "Tutorial/How-To": `I've helped 100+ creators optimize their ${theme.theme.toLowerCase()}.\n\nHere's the framework that works every time:\n\n→ Step 1: [Key action]\n→ Step 2: [Key action]\n→ Step 3: [Key action]\n\nThe creators who implement this see [result].\n\nDM me "FRAMEWORK" and I'll send you my complete guide.`,
        "Behind the Scenes": `What my content creation process actually looks like:\n\nWhat people see: Polished final product\nWhat they don't see: 47 takes, 3 coffee breaks, and one existential crisis\n\nBut here's the thing - that messy middle is where the magic happens.\n\n[Share specific example]\n\nWho else can relate to this creator life?`,
        "Industry Commentary": `Hot take on ${theme.theme}:\n\n[Your perspective]\n\nHere's why this matters for creators and businesses:\n\n1. [Point]\n2. [Point]\n3. [Point]\n\nAm I off base here? I'd love to hear different perspectives in the comments.`,
        "Gear/Tool Reviews": `Just finished testing [tool] for my content workflow.\n\nVerdict after 30 days:\n\n✅ Worth it for: [Use case]\n❌ Skip it if: [Use case]\n\nThe ROI calculation: [Specific numbers if possible]\n\nAsking the community: What tools have been game-changers for your content process?`,
        "Personal Journey": `3 years ago, I made $0 from content creation.\n\nThis year, it's my primary income.\n\nWhat changed? Not my talent - my strategy.\n\nHere's what I learned along the way:\n\n1. [Lesson]\n2. [Lesson]\n3. [Lesson]\n\nTo anyone just starting: your breakthrough is closer than you think.\n\n#contentcreation #creatoreconomy`
      }
    }

    const pillarType = theme.pillar || "Tutorial/How-To"
    return captions[platform]?.[pillarType] || `New content about ${theme.theme} coming your way! Stay tuned 🎬`
  }

  private generatePRCaption(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    brandName: string
  ): string {
    const captions: Record<string, Record<string, string>> = {
      linkedin: {
        "Industry Intelligence": `📊 This week in PR & Marketing:\n\nThe 3 stories you need to know:\n\n1️⃣ [Story + Why it matters]\n\n2️⃣ [Story + Why it matters]\n\n3️⃣ [Story + Why it matters]\n\n💡 The strategic takeaway:\n[Your expert analysis]\n\nWhat's your read on these developments? Share in the comments 👇\n\n#PRNews #Marketing #IndustryInsights`,
        "Client Success Stories": `🎯 Campaign Spotlight:\n\nThe Challenge:\n[Brief problem description]\n\nThe Strategy:\n[What we did differently]\n\nThe Results:\n📈 [Key metric 1]\n📈 [Key metric 2]\n📈 [Key metric 3]\n\nThe secret sauce? [Key insight]\n\nWant to see similar results? Let's connect.\n\n#CaseStudy #PRSuccess #Marketing`,
        "Thought Leadership": `Controversial opinion:\n\n[Your take on ${theme.theme}]\n\nHere's why I believe this:\n\n• [Supporting point 1]\n• [Supporting point 2]\n• [Supporting point 3]\n\nI know this might ruffle some feathers, but the data supports it.\n\n[Specific data point or example]\n\nWhat's your perspective? Agree or disagree?`,
        "Behind the Scenes": `Ever wonder what happens behind a major campaign launch?\n\nHere's a peek inside our process:\n\n9:00 AM - Team sync\n10:00 AM - Client alignment\n11:00 AM - [Creative process]\n2:00 PM - [Execution detail]\n5:00 PM - Launch\n\nThe part nobody sees? The 47 Slack messages and 3 "emergency" calls that made it all happen 😅\n\nThis is the real work behind the polished results.`,
        "Educational Tips": `🔑 PR Pro Tip:\n\n${theme.theme}\n\nThe mistake I see most often:\n[Common mistake]\n\nThe better approach:\n[Your recommendation]\n\nWhy it works:\n[Brief explanation]\n\nSave this for your next campaign 📌\n\n#PRTips #Marketing #CommsStrategy`
      },
      instagram: {
        "Industry Intelligence": `Weekly industry download 📱\n\nThe 3 things every PR pro needs to know this week:\n\n1. [Headline + takeaway]\n2. [Headline + takeaway]\n3. [Headline + takeaway]\n\nSave this for your Monday morning meeting ☕\n\n#PRLife #Marketing #IndustryNews`,
        "Client Success Stories": `The results are in 📈\n\nSwipe to see how we took [client type] from [before state] to [after state] →\n\nThe strategy? It wasn't magic - it was [key approach].\n\nDM us "RESULTS" to learn how we can do this for you.\n\n#CaseStudy #PRResults #Marketing`,
        "Thought Leadership": `Hot take: ${theme.theme}\n\nAgree? Disagree? Let's discuss 👇\n\n#PROpinion #Marketing`,
        "Behind the Scenes": `POV: It's campaign launch day at the agency\n\nThe glamour ✨ The stress 😅 The wins 🎉\n\nSwipe to see what really goes on behind the scenes →\n\n#AgencyLife #PRLife #BehindTheScenes`,
        "Educational Tips": `Save this for later 📌\n\n${theme.theme} - what you need to know:\n\n✅ Do this\n❌ Not this\n💡 Pro tip\n\nShare with someone who needs to see this!\n\n#PRTips #MarketingTips`
      }
    }

    const pillarType = theme.pillar || "Industry Intelligence"
    return captions[platform]?.[pillarType] || `Sharing insights on ${theme.theme} today. What's your take? #PR #Marketing`
  }

  private generateGeneralCaption(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    brandName: string
  ): string {
    return `Excited to share some thoughts on ${theme.theme}!\n\n${theme.description}\n\nWhat do you think? Let us know in the comments 👇\n\n#${brandName.replace(/\s+/g, "")} #ContentStrategy`
  }

  private generateHashtags(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences
  ): string[] {
    const baseHashtags: string[] = []

    // Platform-specific hashtags
    if (platform === "instagram" || platform === "tiktok") {
      if (preferences.primaryUseCase === "podcast_creator") {
        baseHashtags.push(
          "contentcreator", "filmmaker", "videoproduction", "creatorlife",
          "behindthescenes", "filmmaking", "contentcreation", "youtubetips"
        )
      } else if (preferences.primaryUseCase === "pr_industry") {
        baseHashtags.push(
          "prlife", "publicrelations", "marketing", "communications",
          "agencylife", "brandstrategy", "marketingtips"
        )
      }
    }

    if (platform === "linkedin") {
      baseHashtags.push("leadership", "marketing", "business", "strategy")
    }

    // Theme-specific hashtags
    const themeTag = theme.theme.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (themeTag.length > 3) {
      baseHashtags.push(themeTag)
    }

    // Focus topic hashtags
    for (const topic of preferences.focusTopics.slice(0, 2)) {
      const tag = topic.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (tag.length > 3) {
        baseHashtags.push(tag)
      }
    }

    return [...new Set(baseHashtags)].slice(0, 15)
  }

  private generateVisualDescription(
    platform: string,
    postType: PlatformPost["postType"],
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences
  ): string {
    if (postType === "carousel") {
      return `Carousel (5-7 slides):\n• Slide 1: Bold hook statement on branded background\n• Slides 2-5: Key points with icons/illustrations\n• Slide 6: Summary or recap\n• Slide 7: CTA with profile tag`
    }

    if (postType === "reel" || postType === "video") {
      if (preferences.primaryUseCase === "podcast_creator") {
        return `Video (30-60 sec):\n• Hook: Start with the most interesting moment\n• Setup: Brief context (5 sec)\n• Content: Main value/demonstration\n• CTA: Clear next step\n• Style: Authentic, well-lit, good audio`
      }
      return `Video (15-30 sec):\n• Hook: Attention-grabbing opener\n• Content: Quick tips or insights\n• CTA: Engagement prompt\n• Style: Professional but approachable`
    }

    if (postType === "image") {
      return `Single image:\n• High-quality photo or designed graphic\n• Clear focal point\n• Text overlay if applicable\n• Brand colors incorporated`
    }

    return `Text post with optional image:\n• Professional headshot or branded graphic\n• Clean, on-brand design`
  }

  private generateCTA(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences
  ): string {
    const ctas = {
      engagement: [
        "Share your thoughts in the comments 👇",
        "Tag someone who needs to see this",
        "Save this for later 📌",
        "Double tap if you agree",
        "Drop a 🔥 if this resonates"
      ],
      growth: [
        "Follow for more content like this",
        "Turn on notifications to never miss a post",
        "Share this with someone who'd find it valuable"
      ],
      conversion: [
        "DM me 'INFO' to learn more",
        "Link in bio for the full guide",
        "Book a free consultation - link in bio"
      ]
    }

    // Rotate through CTAs
    const allCtas = [...ctas.engagement, ...ctas.growth]
    return allCtas[Math.floor(Math.random() * allCtas.length)]
  }

  private generateHook(
    platform: string,
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences
  ): string {
    if (preferences.primaryUseCase === "podcast_creator") {
      const hooks = [
        "Stop scrolling - you need to see this",
        "This changed everything for me",
        "I wish I knew this sooner",
        "Nobody talks about this, but...",
        "The secret most creators miss",
        "Wait for it...",
        "You're doing this wrong (here's why)"
      ]
      return hooks[Math.floor(Math.random() * hooks.length)]
    }

    const hooks = [
      "Here's what you need to know",
      "This is important",
      "Quick insight for you",
      "Let's talk about this"
    ]
    return hooks[Math.floor(Math.random() * hooks.length)]
  }

  private generateScriptOutline(
    theme: { theme: string; description: string; pillar: string },
    preferences: ContentPreferences
  ): string[] {
    if (preferences.primaryUseCase === "podcast_creator") {
      return [
        "HOOK (0-3 sec): Start with the most interesting part or a bold statement",
        "CONTEXT (3-8 sec): Brief setup - what this is about and why it matters",
        "MAIN CONTENT (8-45 sec): The actual value - tips, tutorial, or story",
        "PAYOFF (45-55 sec): The result, transformation, or key insight",
        "CTA (55-60 sec): What you want them to do next"
      ]
    }

    return [
      "HOOK (0-3 sec): Attention-grabbing opener",
      "VALUE (3-20 sec): Main content or insight",
      "CTA (20-30 sec): Engagement prompt"
    ]
  }

  private getOptimalPostingTime(platform: string, dayOfWeek: string): string {
    const times: Record<string, Record<string, string>> = {
      instagram: {
        Monday: "11:00 AM",
        Tuesday: "10:00 AM",
        Wednesday: "11:00 AM",
        Thursday: "12:00 PM",
        Friday: "10:00 AM",
        Saturday: "9:00 AM",
        Sunday: "10:00 AM"
      },
      linkedin: {
        Monday: "8:00 AM",
        Tuesday: "9:00 AM",
        Wednesday: "12:00 PM",
        Thursday: "8:00 AM",
        Friday: "9:00 AM",
        Saturday: "10:00 AM",
        Sunday: "7:00 PM"
      },
      tiktok: {
        Monday: "6:00 PM",
        Tuesday: "2:00 PM",
        Wednesday: "7:00 PM",
        Thursday: "9:00 PM",
        Friday: "5:00 PM",
        Saturday: "11:00 AM",
        Sunday: "4:00 PM"
      },
      youtube: {
        Monday: "2:00 PM",
        Tuesday: "4:00 PM",
        Wednesday: "3:00 PM",
        Thursday: "5:00 PM",
        Friday: "3:00 PM",
        Saturday: "9:00 AM",
        Sunday: "10:00 AM"
      }
    }

    return times[platform]?.[dayOfWeek] || "10:00 AM"
  }

  private generateThemeOverview(
    themes: { theme: string; description: string; pillar: string }[],
    preferences: ContentPreferences
  ): string {
    const pillars = [...new Set(themes.map(t => t.pillar))]
    return `This ${themes.length}-day content strategy covers ${pillars.join(", ")} to maintain variety and engagement across your audience.`
  }

  private extractPillars(themes: { theme: string; description: string; pillar: string }[]): string[] {
    return [...new Set(themes.map(t => t.pillar))]
  }

  private calculateConfidenceScore(dailyContent: DayContent[]): number {
    // Score based on completeness
    let score = 0
    for (const day of dailyContent) {
      if (day.theme) score += 0.1
      if (day.posts.length > 0) score += 0.1
      for (const post of day.posts) {
        if (post.caption.length > 50) score += 0.05
        if (post.hashtags.length > 5) score += 0.02
      }
    }
    return Math.min(Math.round(score * 100) / 100, 1)
  }

  private formatForTelegram(dailyContent: DayContent[], preferences: ContentPreferences): string[] {
    const messages: string[] = []

    // Header message
    const emoji = preferences.primaryUseCase === "podcast_creator" ? "🎬" : "📅"
    let header = `${emoji} *Your ${dailyContent.length}-Day Content Strategy*\n\n`
    header += `Content pillars: ${this.extractPillars(dailyContent.map(d => ({ theme: d.theme, description: d.themeDescription, pillar: d.theme }))).join(", ")}\n\n`
    header += `_Here's your ready-to-post content for the next ${dailyContent.length} days:_`
    messages.push(header)

    // Individual day messages
    for (const day of dailyContent) {
      let dayMsg = `\n📅 *Day ${day.dayNumber} - ${day.dayOfWeek}, ${day.date}*\n`
      dayMsg += `Theme: _${day.theme}_\n`
      dayMsg += `\n---\n`

      for (const post of day.posts) {
        const platformEmoji = this.getPlatformEmoji(post.platform)
        dayMsg += `\n${platformEmoji} *${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}* (${post.postType})\n`
        dayMsg += `⏰ Best time: ${post.bestPostingTime}\n\n`
        
        if (post.hookLine) {
          dayMsg += `🎣 *Hook:* ${post.hookLine}\n\n`
        }
        
        dayMsg += `📝 *Caption:*\n${post.caption}\n\n`
        dayMsg += `#️⃣ *Hashtags:*\n${post.hashtags.map(h => `#${h}`).join(" ")}\n\n`
        dayMsg += `🎨 *Visual:*\n${post.visualDescription}\n\n`
        
        if (post.scriptOutline && post.scriptOutline.length > 0) {
          dayMsg += `🎬 *Script Outline:*\n${post.scriptOutline.map(s => `• ${s}`).join("\n")}\n\n`
        }
        
        dayMsg += `👉 *CTA:* ${post.callToAction}\n`
        dayMsg += `\n---`
      }

      messages.push(dayMsg)
    }

    // Footer
    messages.push(`\n_Generated by KORA Intelligence_\n\n💡 Tip: Save these messages and schedule your posts in advance!`)

    return messages
  }

  private getPlatformEmoji(platform: string): string {
    const emojis: Record<string, string> = {
      instagram: "📸",
      tiktok: "🎵",
      youtube: "▶️",
      linkedin: "💼",
      twitter: "🐦",
      facebook: "👥"
    }
    return emojis[platform] || "📱"
  }

  private async saveDraft(tenantId: string, output: ContentDraftOutput): Promise<void> {
    try {
      await supabase.from("intel_content_drafts").insert({
        tenant_id: tenantId,
        strategy_type: output.strategyType,
        start_date: output.startDate.toISOString().split("T")[0],
        daily_content: output.dailyContent,
        theme_overview: output.themeOverview,
        content_pillars_used: output.contentPillarsUsed,
        confidence_score: output.confidenceScore
      })
    } catch (error) {
      console.error("[ContentDraftAgent] Failed to save draft:", error)
    }
  }
}

// Export singleton instance
export const contentDraftAgent = new ContentDraftAgent()

// Convenience function
export async function generateContentDraft(
  tenantId: string,
  telegramId: number,
  strategyType: "3day" | "5day",
  preferences?: ContentPreferences,
  startDate?: Date
): Promise<ContentDraftOutput | null> {
  const result = await contentDraftAgent.run(
    {} as any, // Minimal context for standalone use
    { tenantId, telegramId, strategyType, preferences, startDate }
  )

  return result.success ? result.data! : null
}
