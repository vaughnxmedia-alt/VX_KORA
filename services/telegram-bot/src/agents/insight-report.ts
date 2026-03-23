/**
 * Insight Report Agent
 * 
 * Generates curated industry insight reports from approved sources + live news.
 * Delivers formatted reports via Telegram for daily/weekly consumption.
 */

import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent.js"
import type { AgentOutput } from "../types/pipeline.js"
import { tavilyClient } from "../search/tavily-client.js"
import type { SearchResult } from "../search/types.js"
import { createClient } from "@supabase/supabase-js"

// Types
export interface InsightReportInput {
  tenantId: string
  telegramId: number
  reportType: "daily" | "weekly" | "on_demand"
  preferences?: ContentPreferences
}

export interface ContentPreferences {
  primaryUseCase: "pr_industry" | "podcast_creator" | "general"
  platformPriority: string[]
  contentTone: "professional" | "casual" | "creator"
  focusTopics: string[]
  industryFocus?: string[]
  podcastName?: string
  podcastThemes?: string[]
}

export interface TopStory {
  headline: string
  source: string
  sourceUrl: string
  summary: string
  strategicAngle: string
  relevanceScore: number
  publishedAt?: string
}

export interface TrendingTopic {
  topic: string
  whyItMatters: string
  contentOpportunity: string
  platforms: string[]
}

export interface ContentOpportunity {
  idea: string
  format: string
  platform: string
  timeliness: "urgent" | "this_week" | "evergreen"
  hookSuggestion?: string
}

export interface InsightReportOutput {
  reportDate: Date
  reportType: "daily" | "weekly" | "on_demand"
  
  topStories: TopStory[]
  strategicTakeaways: string[]
  trendingTopics: TrendingTopic[]
  contentOpportunities: ContentOpportunity[]
  
  sourcesReferenced: string[]
  newsApiQueries: string[]
  
  confidenceScore: number
  relevanceScore: number
  
  formattedMessage: string
}

// Supabase client (lazy so bot can start without SUPABASE_* set)
let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase(): ReturnType<typeof createClient> {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required for insight reports")
    _supabase = createClient(url, key)
  }
  return _supabase
}

export class InsightReportAgent extends BaseIntelAgent<InsightReportInput, InsightReportOutput> {
  constructor() {
    super("InsightReportAgent", "research")
  }

  protected async execute(
    context: any,
    input: InsightReportInput
  ): Promise<AgentOutput<InsightReportOutput>> {
    console.log(`[InsightReportAgent] Generating ${input.reportType} report for tenant ${input.tenantId}`)

    try {
      // Step 1: Load preferences if not provided
      await this.reportStepStart("Loading content preferences")
      const preferences = input.preferences || await this.loadPreferences(input.tenantId)
      await this.reportStepComplete("Loading content preferences")

      // Step 2: Load approved sources
      await this.reportStepStart("Loading approved intelligence sources")
      const approvedSources = await this.loadApprovedSources(input.tenantId)
      await this.reportStepComplete("Loading approved intelligence sources", { sources: approvedSources.length })

      // Step 3: Fetch live news based on preferences
      await this.reportStepStart("Fetching live industry news")
      const newsQueries = this.buildNewsQueries(preferences)
      const newsResults = await this.fetchLiveNews(newsQueries)
      await this.reportStepComplete("Fetching live industry news", { queries: newsQueries.length, sources: newsResults.length })

      // Step 4: Curate and rank stories
      await this.reportStepStart("Curating and ranking top stories")
      const topStories = await this.curateTopStories(newsResults, preferences, approvedSources)
      await this.reportStepComplete("Curating and ranking top stories")

      // Step 5: Extract strategic takeaways
      await this.reportStepStart("Extracting strategic takeaways")
      const strategicTakeaways = this.extractStrategicTakeaways(topStories, preferences)
      await this.reportStepComplete("Extracting strategic takeaways")

      // Step 6: Identify trending topics
      await this.reportStepStart("Identifying trending topics")
      const trendingTopics = await this.identifyTrendingTopics(newsResults, preferences)
      await this.reportStepComplete("Identifying trending topics")

      // Step 7: Generate content opportunities
      await this.reportStepStart("Generating content opportunities")
      const contentOpportunities = this.generateContentOpportunities(topStories, trendingTopics, preferences)
      await this.reportStepComplete("Generating content opportunities")

      // Step 8: Format the report
      await this.reportStepStart("Formatting report for Telegram")
      const formattedMessage = this.formatReportForTelegram(
        input.reportType,
        topStories,
        strategicTakeaways,
        trendingTopics,
        contentOpportunities,
        preferences
      )
      await this.reportStepComplete("Formatting report for Telegram")

      // Calculate quality scores
      const confidenceScore = this.calculateConfidenceScore(topStories, newsResults.length)
      const relevanceScore = this.calculateRelevanceScore(topStories, preferences)

      const output: InsightReportOutput = {
        reportDate: new Date(),
        reportType: input.reportType,
        topStories,
        strategicTakeaways,
        trendingTopics,
        contentOpportunities,
        sourcesReferenced: [...new Set(topStories.map(s => s.source))],
        newsApiQueries: newsQueries,
        confidenceScore,
        relevanceScore,
        formattedMessage
      }

      // Save to database
      await this.saveReport(input.tenantId, output)

      return createAgentOutput(true, output, "generation")

    } catch (error: any) {
      console.error(`[InsightReportAgent] Error:`, error)
      return createAgentOutput(false, undefined, undefined, error.message)
    }
  }

  private async loadPreferences(tenantId: string): Promise<ContentPreferences> {
    const { data, error } = await getSupabase()
      .from("intel_content_preferences")
      .select("*")
      .eq("tenant_id", tenantId)
      .single()

    if (error || !data) {
      // Return defaults
      return {
        primaryUseCase: "general",
        platformPriority: ["instagram", "linkedin"],
        contentTone: "professional",
        focusTopics: ["industry trends", "marketing", "content strategy"],
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

  private async loadApprovedSources(tenantId: string): Promise<any[]> {
    const { data, error } = await getSupabase()
      .from("intel_sources")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["approved", "trusted"])
      .eq("is_active", true)
      .limit(50)

    if (error) {
      console.error("[InsightReportAgent] Error loading sources:", error)
      return []
    }

    return data || []
  }

  private buildNewsQueries(preferences: ContentPreferences): string[] {
    const queries: string[] = []
    const today = new Date().toISOString().split("T")[0]

    // Base queries by use case
    if (preferences.primaryUseCase === "pr_industry") {
      queries.push(
        "PR industry news today",
        "brand crisis management news",
        "influencer marketing news",
        "creator economy updates",
        "viral marketing campaigns 2026",
        "social media platform changes"
      )
    } else if (preferences.primaryUseCase === "podcast_creator") {
      queries.push(
        "filmmaking technology news",
        "content creation tools AI",
        "video production trends",
        "podcast industry news",
        "YouTube creator news",
        "AI video editing tools"
      )
    } else {
      queries.push(
        "digital marketing news today",
        "social media marketing trends",
        "content marketing updates"
      )
    }

    // Add focus topic queries
    for (const topic of preferences.focusTopics.slice(0, 3)) {
      queries.push(`${topic} news ${today}`)
    }

    // Add industry queries
    if (preferences.industryFocus) {
      for (const industry of preferences.industryFocus.slice(0, 2)) {
        queries.push(`${industry} industry trends`)
      }
    }

    return queries
  }

  private async fetchLiveNews(queries: string[]): Promise<SearchResult[]> {
    const allResults: SearchResult[] = []

    for (const query of queries) {
      try {
        const response = await tavilyClient.searchNews(query, {
          maxResults: 5,
          includeSnippets: true
        })
        
        if (response.results) {
          allResults.push(...response.results)
        }
      } catch (error) {
        console.error(`[InsightReportAgent] News search failed for: ${query}`, error)
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>()
    return allResults.filter(r => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })
  }

  private async curateTopStories(
    newsResults: SearchResult[],
    preferences: ContentPreferences,
    approvedSources: any[]
  ): Promise<TopStory[]> {
    const approvedDomains = new Set(
      approvedSources
        .filter(s => s.url)
        .map(s => new URL(s.url).hostname.replace("www.", ""))
    )

    const scoredStories = newsResults.map(result => {
      let score = result.score || 0.5

      // Boost if from approved source
      try {
        const domain = new URL(result.url).hostname.replace("www.", "")
        if (approvedDomains.has(domain)) {
          score += 0.2
        }
      } catch {}

      // Boost if matches focus topics
      const text = `${result.title} ${result.snippet || ""}`.toLowerCase()
      for (const topic of preferences.focusTopics) {
        if (text.includes(topic.toLowerCase())) {
          score += 0.1
        }
      }

      // Penalize older content (if date available)
      if (result.publishedDate) {
        const ageHours = (Date.now() - new Date(result.publishedDate).getTime()) / (1000 * 60 * 60)
        if (ageHours > 48) score -= 0.1
        if (ageHours > 168) score -= 0.2 // > 1 week
      }

      return { result, score: Math.min(score, 1) }
    })

    // Sort by score and take top 5
    const topResults = scoredStories
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return topResults.map(({ result, score }) => ({
      headline: result.title,
      source: this.extractSourceName(result.url),
      sourceUrl: result.url,
      summary: result.snippet || "",
      strategicAngle: this.generateStrategicAngle(result, preferences),
      relevanceScore: score,
      publishedAt: result.publishedDate
    }))
  }

  private extractSourceName(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace("www.", "")
      const parts = hostname.split(".")
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    } catch {
      return "Unknown"
    }
  }

  private generateStrategicAngle(result: SearchResult, preferences: ContentPreferences): string {
    const text = `${result.title} ${result.snippet || ""}`.toLowerCase()

    if (preferences.primaryUseCase === "pr_industry") {
      if (text.includes("crisis") || text.includes("controversy")) {
        return "Crisis management lesson - document for future client reference"
      }
      if (text.includes("campaign") || text.includes("viral")) {
        return "Campaign case study - analyze what made it work"
      }
      if (text.includes("influencer") || text.includes("creator")) {
        return "Creator economy shift - consider for client strategies"
      }
      return "Industry intelligence - share with relevant clients"
    }

    if (preferences.primaryUseCase === "podcast_creator") {
      if (text.includes("ai") || text.includes("tool")) {
        return "Potential podcast episode topic - test and review"
      }
      if (text.includes("technique") || text.includes("workflow")) {
        return "Tutorial content opportunity - create how-to content"
      }
      if (text.includes("trend") || text.includes("future")) {
        return "Discussion topic - invite expert guest"
      }
      return "Industry update - mention in next episode"
    }

    return "Consider for upcoming content"
  }

  private extractStrategicTakeaways(stories: TopStory[], preferences: ContentPreferences): string[] {
    const takeaways: string[] = []

    // Analyze patterns in top stories
    const themes = new Map<string, number>()
    for (const story of stories) {
      const text = `${story.headline} ${story.summary}`.toLowerCase()
      
      const themeKeywords = [
        ["ai", "artificial intelligence", "machine learning"],
        ["creator", "influencer", "content creator"],
        ["platform", "algorithm", "social media"],
        ["brand", "marketing", "campaign"],
        ["video", "visual", "short-form"],
        ["podcast", "audio", "voice"]
      ]

      for (const [key, ...aliases] of themeKeywords) {
        if ([key, ...aliases].some(k => text.includes(k))) {
          themes.set(key, (themes.get(key) || 0) + 1)
        }
      }
    }

    // Generate takeaways based on themes
    const sortedThemes = [...themes.entries()].sort((a, b) => b[1] - a[1])

    for (const [theme, count] of sortedThemes.slice(0, 3)) {
      if (count >= 2) {
        if (preferences.primaryUseCase === "pr_industry") {
          takeaways.push(this.getPRTakeaway(theme))
        } else if (preferences.primaryUseCase === "podcast_creator") {
          takeaways.push(this.getCreatorTakeaway(theme))
        } else {
          takeaways.push(this.getGeneralTakeaway(theme))
        }
      }
    }

    // Add a general actionable takeaway
    if (takeaways.length < 3) {
      takeaways.push("Review your content calendar against these trends and adjust if needed")
    }

    return takeaways.slice(0, 4)
  }

  private getPRTakeaway(theme: string): string {
    const takeaways: Record<string, string> = {
      "ai": "AI is reshaping PR workflows - ensure clients understand AI disclosure requirements",
      "creator": "Creator partnerships continue to outperform traditional ads - expand creator roster",
      "platform": "Platform changes require proactive client communication - prepare talking points",
      "brand": "Brand authenticity is under scrutiny - audit client messaging for consistency",
      "video": "Video-first strategies are non-negotiable - increase video production capacity",
      "podcast": "Podcast PR placements driving results - build podcast pitch list for clients"
    }
    return takeaways[theme] || "Stay ahead of industry shifts - schedule client strategy reviews"
  }

  private getCreatorTakeaway(theme: string): string {
    const takeaways: Record<string, string> = {
      "ai": "New AI tools could streamline your workflow - dedicate time to test top 3",
      "creator": "Creator economy evolving - document your unique process for audience",
      "platform": "Algorithm changes favor authentic content - double down on BTS content",
      "brand": "Brand deals shifting to long-term partnerships - pitch retainer relationships",
      "video": "Short-form driving discovery, long-form building loyalty - balance both",
      "podcast": "Podcast guests driving cross-promotion - batch record guest episodes"
    }
    return takeaways[theme] || "Industry moving fast - reserve time weekly for skill development"
  }

  private getGeneralTakeaway(theme: string): string {
    const takeaways: Record<string, string> = {
      "ai": "AI tools can boost productivity - identify 1-2 to implement this week",
      "creator": "Creator content performs well - consider UGC or creator partnerships",
      "platform": "Stay updated on platform changes - adjust strategy as needed",
      "brand": "Brand consistency matters - review and align all touchpoints",
      "video": "Video content is essential - prioritize video in content mix",
      "podcast": "Audio content growing - consider podcast or audio strategy"
    }
    return takeaways[theme] || "Review your strategy against current trends"
  }

  private async identifyTrendingTopics(
    newsResults: SearchResult[],
    preferences: ContentPreferences
  ): Promise<TrendingTopic[]> {
    // Extract common topics from news
    const topicCounts = new Map<string, { count: number; examples: string[] }>()
    
    const topicPatterns = [
      { pattern: /\bai\b|artificial intelligence|machine learning/gi, topic: "AI & Automation" },
      { pattern: /\bcreator\b|influencer|ugc/gi, topic: "Creator Economy" },
      { pattern: /\btiktok\b|reels|short.?form/gi, topic: "Short-Form Video" },
      { pattern: /\bpodcast\b|audio\b/gi, topic: "Audio Content" },
      { pattern: /\bbrand\b|rebrand|identity/gi, topic: "Brand Strategy" },
      { pattern: /\bviral\b|trending|moment/gi, topic: "Viral Moments" },
      { pattern: /\bprivacy\b|data|regulation/gi, topic: "Privacy & Data" },
      { pattern: /\bcommunity\b|engagement|authentic/gi, topic: "Community Building" }
    ]

    for (const result of newsResults) {
      const text = `${result.title} ${result.snippet || ""}`
      for (const { pattern, topic } of topicPatterns) {
        if (pattern.test(text)) {
          const current = topicCounts.get(topic) || { count: 0, examples: [] }
          current.count++
          if (current.examples.length < 2) {
            current.examples.push(result.title)
          }
          topicCounts.set(topic, current)
        }
      }
    }

    // Convert to trending topics
    const trending = [...topicCounts.entries()]
      .filter(([_, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([topic, data]) => ({
        topic,
        whyItMatters: this.getWhyItMatters(topic, preferences),
        contentOpportunity: this.getContentOpportunity(topic, preferences),
        platforms: this.getRelevantPlatforms(topic, preferences.platformPriority)
      }))

    return trending
  }

  private getWhyItMatters(topic: string, preferences: ContentPreferences): string {
    if (preferences.primaryUseCase === "pr_industry") {
      const matters: Record<string, string> = {
        "AI & Automation": "Clients asking about AI integration in PR campaigns",
        "Creator Economy": "Creator partnerships now essential for brand campaigns",
        "Short-Form Video": "TikTok/Reels driving majority of earned media",
        "Audio Content": "Podcast placements generating high-value coverage",
        "Brand Strategy": "Brand perception shifts requiring proactive management",
        "Viral Moments": "Real-time response capabilities differentiate agencies",
        "Privacy & Data": "New regulations affecting influencer disclosures",
        "Community Building": "Brands investing in owned community channels"
      }
      return matters[topic] || "Emerging trend affecting client strategies"
    }

    if (preferences.primaryUseCase === "podcast_creator") {
      const matters: Record<string, string> = {
        "AI & Automation": "New tools could cut your editing time in half",
        "Creator Economy": "Monetization models evolving - new opportunities",
        "Short-Form Video": "Short clips driving podcast discovery",
        "Audio Content": "Podcast ad revenue and sponsorships growing",
        "Brand Strategy": "Personal brand differentiation more important",
        "Viral Moments": "Trending topics drive episode downloads",
        "Privacy & Data": "Platform policies affecting creator data access",
        "Community Building": "Community = sustainable creator business"
      }
      return matters[topic] || "Trend affecting content creators"
    }

    return "Industry trend worth monitoring"
  }

  private getContentOpportunity(topic: string, preferences: ContentPreferences): string {
    if (preferences.primaryUseCase === "podcast_creator") {
      const opportunities: Record<string, string> = {
        "AI & Automation": "Tool review video or podcast episode",
        "Creator Economy": "Share your experience and lessons learned",
        "Short-Form Video": "Create behind-the-scenes clips from long-form",
        "Audio Content": "Collaborate with other podcasters",
        "Brand Strategy": "Document your branding process",
        "Viral Moments": "React video or commentary episode",
        "Privacy & Data": "Educational content on protecting your content",
        "Community Building": "Host community Q&A or AMA"
      }
      return opportunities[topic] || "Create educational or opinion content"
    }

    const opportunities: Record<string, string> = {
      "AI & Automation": "Thought leadership post on AI implementation",
      "Creator Economy": "Case study or partnership announcement",
      "Short-Form Video": "Quick tips series or trend participation",
      "Audio Content": "Guest appearance or branded podcast",
      "Brand Strategy": "Brand story or values content",
      "Viral Moments": "Timely commentary or reactive content",
      "Privacy & Data": "Educational content on compliance",
      "Community Building": "Community spotlight or engagement content"
    }
    return opportunities[topic] || "Create relevant thought leadership content"
  }

  private getRelevantPlatforms(topic: string, userPlatforms: string[]): string[] {
    const platformMap: Record<string, string[]> = {
      "AI & Automation": ["linkedin", "youtube", "twitter"],
      "Creator Economy": ["instagram", "tiktok", "youtube"],
      "Short-Form Video": ["tiktok", "instagram", "youtube"],
      "Audio Content": ["spotify", "youtube", "linkedin"],
      "Brand Strategy": ["linkedin", "instagram"],
      "Viral Moments": ["tiktok", "twitter", "instagram"],
      "Privacy & Data": ["linkedin", "twitter"],
      "Community Building": ["instagram", "discord", "youtube"]
    }

    const relevant = platformMap[topic] || userPlatforms
    return relevant.filter(p => userPlatforms.includes(p) || relevant.includes(p)).slice(0, 3)
  }

  private generateContentOpportunities(
    stories: TopStory[],
    trends: TrendingTopic[],
    preferences: ContentPreferences
  ): ContentOpportunity[] {
    const opportunities: ContentOpportunity[] = []

    // Generate from top stories
    for (const story of stories.slice(0, 2)) {
      if (preferences.primaryUseCase === "podcast_creator") {
        opportunities.push({
          idea: `React to: "${story.headline}"`,
          format: "short-form video",
          platform: preferences.platformPriority[0] || "tiktok",
          timeliness: "urgent",
          hookSuggestion: `"Did you see what just happened with ${story.source}?"`
        })
      } else {
        opportunities.push({
          idea: `Commentary on: "${story.headline}"`,
          format: "linkedin post",
          platform: "linkedin",
          timeliness: "urgent",
          hookSuggestion: `"Here's what this means for ${preferences.industryFocus?.[0] || 'your brand'}..."`
        })
      }
    }

    // Generate from trends
    for (const trend of trends.slice(0, 2)) {
      opportunities.push({
        idea: `Deep dive: ${trend.topic}`,
        format: preferences.primaryUseCase === "podcast_creator" ? "youtube video" : "carousel post",
        platform: trend.platforms[0],
        timeliness: "this_week"
      })
    }

    // Add evergreen opportunity
    if (preferences.primaryUseCase === "podcast_creator" && preferences.podcastName) {
      opportunities.push({
        idea: `Episode idea: Interview an expert on ${trends[0]?.topic || "industry trends"}`,
        format: "podcast episode",
        platform: "youtube",
        timeliness: "this_week"
      })
    }

    return opportunities.slice(0, 5)
  }

  private formatReportForTelegram(
    reportType: string,
    stories: TopStory[],
    takeaways: string[],
    trends: TrendingTopic[],
    opportunities: ContentOpportunity[],
    preferences: ContentPreferences
  ): string {
    const date = new Date().toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "long", 
      day: "numeric" 
    })

    const emoji = preferences.primaryUseCase === "podcast_creator" ? "🎬" : "📊"
    const title = preferences.primaryUseCase === "podcast_creator" 
      ? "Creator Industry Insights"
      : "Industry Insights"

    let message = `${emoji} *${title} - ${date}*\n\n`

    // Top Stories
    message += `🔥 *Top Stories*\n`
    for (let i = 0; i < Math.min(stories.length, 3); i++) {
      const story = stories[i]
      message += `\n${i + 1}. *${story.headline}*\n`
      message += `   _${story.source}_\n`
      message += `   ${story.strategicAngle}\n`
    }

    // Strategic Takeaways
    message += `\n💡 *Strategic Takeaways*\n`
    for (const takeaway of takeaways) {
      message += `• ${takeaway}\n`
    }

    // Trending Topics
    if (trends.length > 0) {
      message += `\n📈 *Trending Topics*\n`
      for (const trend of trends.slice(0, 3)) {
        message += `• *${trend.topic}* - ${trend.whyItMatters}\n`
      }
    }

    // Content Opportunities
    if (opportunities.length > 0) {
      message += `\n🎯 *Content Opportunities*\n`
      for (const opp of opportunities.slice(0, 3)) {
        const urgency = opp.timeliness === "urgent" ? "⚡" : "📅"
        message += `${urgency} ${opp.idea}\n`
        message += `   _${opp.format} on ${opp.platform}_\n`
      }
    }

    // Sign off
    message += `\n---\n`
    message += `_Generated by KORA Intelligence_`

    return message
  }

  private calculateConfidenceScore(stories: TopStory[], totalResults: number): number {
    if (stories.length === 0) return 0
    
    const avgRelevance = stories.reduce((sum, s) => sum + s.relevanceScore, 0) / stories.length
    const coverageFactor = Math.min(totalResults / 20, 1) // Good coverage = 20+ results
    
    return Math.round((avgRelevance * 0.7 + coverageFactor * 0.3) * 100) / 100
  }

  private calculateRelevanceScore(stories: TopStory[], preferences: ContentPreferences): number {
    if (stories.length === 0) return 0

    let relevantCount = 0
    for (const story of stories) {
      const text = `${story.headline} ${story.summary}`.toLowerCase()
      const isRelevant = preferences.focusTopics.some(t => text.includes(t.toLowerCase()))
      if (isRelevant) relevantCount++
    }

    return Math.round((relevantCount / stories.length) * 100) / 100
  }

  private async saveReport(tenantId: string, output: InsightReportOutput): Promise<void> {
    try {
      await getSupabase().from("intel_insight_reports").insert({
        tenant_id: tenantId,
        report_date: output.reportDate.toISOString().split("T")[0],
        report_type: output.reportType,
        top_stories: output.topStories,
        strategic_takeaways: output.strategicTakeaways,
        trending_topics: output.trendingTopics,
        content_opportunities: output.contentOpportunities,
        sources_referenced: output.sourcesReferenced,
        news_api_queries: output.newsApiQueries,
        confidence_score: output.confidenceScore,
        relevance_score: output.relevanceScore
      })
    } catch (error) {
      console.error("[InsightReportAgent] Failed to save report:", error)
    }
  }
}

// Export singleton instance
export const insightReportAgent = new InsightReportAgent()

// Convenience function
export async function generateInsightReport(
  tenantId: string,
  telegramId: number,
  reportType: "daily" | "weekly" | "on_demand" = "on_demand",
  preferences?: ContentPreferences
): Promise<InsightReportOutput | null> {
  const result = await insightReportAgent.run(
    {} as any, // Minimal context for standalone use
    { tenantId, telegramId, reportType, preferences }
  )

  return result.success ? result.data! : null
}
