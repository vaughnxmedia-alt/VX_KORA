import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { 
  SocialProfileAudit, 
  ResearchFinding, 
  WebsiteAnalysis,
  ResearchContext,
  SocialPlatform 
} from "../types/research"
import { 
  createResearchSource, 
  updateResearchSource, 
  createResearchFinding,
  getResearchFindingsByTenant 
} from "../db/research-findings"
import { upsertSocialAudit, getSocialAuditsByTenant } from "../db/social-audits"
import { updateTenantProfile } from "../db/tenant-profiles"

export interface ProfileResearchInput {
  websiteUrl?: string
  socialHandles?: Record<SocialPlatform, string>
  skipWebsite?: boolean
  skipSocial?: boolean
}

export interface ProfileResearchOutput {
  websiteAnalysis: WebsiteAnalysis | null
  socialAudits: SocialProfileAudit[]
  findings: ResearchFinding[]
  researchContext: ResearchContext
}

export class ProfileResearchAgent extends BaseIntelAgent<ProfileResearchInput, ProfileResearchOutput> {
  constructor() {
    super("ProfileResearchAgent", "research")
  }

  protected async execute(
    context: PipelineContext,
    input: ProfileResearchInput
  ): Promise<AgentOutput<ProfileResearchOutput>> {
    await updateTenantProfile(context.tenant.id, {
      researchStatus: "in_progress",
    })

    let websiteAnalysis: WebsiteAnalysis | null = null
    const socialAudits: SocialProfileAudit[] = []
    const findings: ResearchFinding[] = []

    if (input.websiteUrl && !input.skipWebsite) {
      try {
        websiteAnalysis = await this.analyzeWebsite(context, input.websiteUrl)
        
        if (websiteAnalysis) {
          const websiteFindings = await this.extractWebsiteFindings(
            context,
            websiteAnalysis
          )
          findings.push(...websiteFindings)
        }
      } catch (error) {
        console.error("Website analysis failed:", (error as Error).message)
        this.recordError((error as Error).message, "WEBSITE_ANALYSIS_FAILED", true)
      }
    }

    if (input.socialHandles && !input.skipSocial) {
      for (const [platform, handle] of Object.entries(input.socialHandles)) {
        if (!handle) continue

        try {
          const audit = await this.auditSocialProfile(
            context,
            platform as SocialPlatform,
            handle
          )
          
          if (audit) {
            socialAudits.push(audit)
            
            const socialFindings = await this.extractSocialFindings(
              context,
              audit
            )
            findings.push(...socialFindings)
          }
        } catch (error) {
          console.error(`Social audit failed for ${platform}:`, (error as Error).message)
          this.recordError((error as Error).message, `SOCIAL_AUDIT_FAILED_${platform.toUpperCase()}`, true)
        }
      }
    }

    const allFindings = await getResearchFindingsByTenant(context.tenant.id)
    const allAudits = await getSocialAuditsByTenant(context.tenant.id)

    const researchContext: ResearchContext = {
      websiteAnalysis,
      socialAudits: allAudits,
      findings: allFindings,
      overallConfidence: this.calculateOverallConfidence(allFindings),
      gaps: this.identifyResearchGaps(websiteAnalysis, allAudits, allFindings),
    }

    await updateTenantProfile(context.tenant.id, {
      researchStatus: "complete",
    })

    return createAgentOutput(true, {
      websiteAnalysis,
      socialAudits,
      findings,
      researchContext,
    }, {
      nextStage: "generation",
      updatedContext: {
        researchContext,
      },
    })
  }

  private async analyzeWebsite(
    context: PipelineContext,
    url: string
  ): Promise<WebsiteAnalysis | null> {
    const source = await createResearchSource({
      tenantId: context.tenant.id,
      sourceType: "website",
      sourceUrl: url,
      sourceName: new URL(url).hostname,
    })

    if (!source) return null

    await updateResearchSource(source.id, { status: "fetching" })

    let htmlContent: string
    try {
      htmlContent = await this.fetchWebsiteContent(url)
      await updateResearchSource(source.id, {
        status: "fetched",
        accessedAt: new Date(),
        rawContent: htmlContent.substring(0, 100000),
        contentLength: htmlContent.length,
        contentType: "html",
      })
    } catch (error) {
      await updateResearchSource(source.id, {
        status: "failed",
        errorMessage: (error as Error).message,
      })
      throw error
    }

    await updateResearchSource(source.id, { status: "analyzing" })

    const analysis = await this.runWebsiteAnalysis(context, url, htmlContent)

    await updateResearchSource(source.id, {
      status: "analyzed",
      analyzedAt: new Date(),
    })

    this.incrementItemsProcessed()
    return analysis
  }

  private async fetchWebsiteContent(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KORA Intelligence Bot/1.0",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`)
    }

    return response.text()
  }

  private async runWebsiteAnalysis(
    context: PipelineContext,
    url: string,
    htmlContent: string
  ): Promise<WebsiteAnalysis> {
    const response = await this.router.complete({
      taskType: "website_analysis",
      agentName: this.getName(),
      tenantId: context.tenantId,
      pipelineRunId: context.runId,
      prompt: `Analyze this website HTML and extract brand-relevant information.

Website URL: ${url}

HTML Content (truncated):
${htmlContent.substring(0, 50000)}

Extract:
1. Page title and tagline
2. About/mission section content
3. Services or products offered
4. Brand voice/tone indicators
5. Visual style descriptions mentioned
6. Any testimonials or social proof
7. Key positioning statements

Return as JSON with these fields:
- title (string)
- tagline (string or null)
- aboutSection (string or null)
- services (array of strings)
- brandSignals (array of {signal, evidence, confidence})
- toneAnalysis ({overall, keywords, formality})
- positioningClues (array of strings)`,
      jsonSchema: {
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
              formality: { type: "string" }
            }
          },
          positioningClues: { type: "array", items: { type: "string" } }
        }
      },
    })

    this.recordLLMUsage(response.totalTokens, response.costUsd)

    const parsed = JSON.parse(response.content)

    return {
      url,
      title: parsed.title || null,
      tagline: parsed.tagline || null,
      aboutSection: parsed.aboutSection || null,
      services: parsed.services || [],
      team: [],
      testimonials: [],
      brandSignals: parsed.brandSignals || [],
      toneAnalysis: parsed.toneAnalysis || { overall: "", keywords: [], sentiment: "neutral", formality: "mixed" },
      positioningClues: parsed.positioningClues || [],
      rawHtml: null,
      fetchedAt: new Date(),
      error: null,
    }
  }

  private async extractWebsiteFindings(
    context: PipelineContext,
    analysis: WebsiteAnalysis
  ): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = []

    for (const signal of analysis.brandSignals) {
      const finding = await createResearchFinding({
        tenantId: context.tenant.id,
        findingType: "brand_signal",
        findingCategory: signal.confidence > 0.7 ? "verified" : "inferred",
        summary: signal.signal,
        details: { evidence: signal.evidence },
        evidence: signal.evidence,
        confidenceScore: signal.confidence,
        relevanceScore: 0.8,
      })
      if (finding) findings.push(finding)
    }

    for (const clue of analysis.positioningClues) {
      const finding = await createResearchFinding({
        tenantId: context.tenant.id,
        findingType: "positioning_clue",
        findingCategory: "verified",
        summary: clue,
        confidenceScore: 0.8,
        relevanceScore: 0.9,
      })
      if (finding) findings.push(finding)
    }

    return findings
  }

  private async auditSocialProfile(
    context: PipelineContext,
    platform: SocialPlatform,
    handle: string
  ): Promise<SocialProfileAudit | null> {
    const source = await createResearchSource({
      tenantId: context.tenant.id,
      sourceType: "social_profile",
      sourceUrl: this.getSocialProfileUrl(platform, handle),
      sourceName: `${platform}: ${handle}`,
    })

    if (!source) return null

    const inferredData = await this.inferSocialProfileData(context, platform, handle)

    const audit = await upsertSocialAudit({
      tenantId: context.tenant.id,
      platform,
      profileHandle: handle,
      profileUrl: this.getSocialProfileUrl(platform, handle),
      ...inferredData,
      dataSource: "inferred",
      confidenceScore: 0.5,
    })

    await updateResearchSource(source.id, {
      status: "analyzed",
      analyzedAt: new Date(),
    })

    this.incrementItemsProcessed()
    return audit
  }

  private getSocialProfileUrl(platform: SocialPlatform, handle: string): string {
    const cleanHandle = handle.replace(/^@/, "")
    const urls: Record<SocialPlatform, string> = {
      instagram: `https://instagram.com/${cleanHandle}`,
      twitter: `https://twitter.com/${cleanHandle}`,
      linkedin: handle.includes("linkedin.com") ? handle : `https://linkedin.com/in/${cleanHandle}`,
      youtube: handle.includes("youtube.com") ? handle : `https://youtube.com/@${cleanHandle}`,
      tiktok: `https://tiktok.com/@${cleanHandle}`,
      facebook: `https://facebook.com/${cleanHandle}`,
      threads: `https://threads.net/@${cleanHandle}`,
    }
    return urls[platform]
  }

  private async inferSocialProfileData(
    context: PipelineContext,
    platform: SocialPlatform,
    handle: string
  ): Promise<Partial<SocialProfileAudit>> {
    const response = await this.router.complete({
      taskType: "profile_analysis",
      agentName: this.getName(),
      tenantId: context.tenantId,
      pipelineRunId: context.runId,
      prompt: `Based on general knowledge about ${platform} and the handle "${handle}", infer likely characteristics of this social media profile for a business/brand.

This is for a ${context.tenant.businessType || "business"} called "${context.tenant.businessName || handle}".

Provide reasonable estimates and inferences. Mark everything as "inferred" since we don't have actual API data.

Return JSON with:
- contentThemes (array of likely content themes based on business type)
- platformStrengths (array of what they likely do well)
- platformWeaknesses (array of likely areas to improve)
- postingFrequency (estimate: "daily", "several_per_week", "weekly", "sporadic")
- contentFormats (array of likely content formats for this platform)`,
      jsonSchema: {
        type: "object",
        properties: {
          contentThemes: { type: "array", items: { type: "string" } },
          platformStrengths: { type: "array", items: { type: "string" } },
          platformWeaknesses: { type: "array", items: { type: "string" } },
          postingFrequency: { type: "string" },
          contentFormats: { type: "array", items: { type: "string" } }
        }
      },
    })

    this.recordLLMUsage(response.totalTokens, response.costUsd)

    const parsed = JSON.parse(response.content)

    return {
      contentThemes: parsed.contentThemes || [],
      platformStrengths: parsed.platformStrengths || [],
      platformWeaknesses: parsed.platformWeaknesses || [],
      postingFrequency: parsed.postingFrequency || "sporadic",
      contentFormats: parsed.contentFormats || [],
    }
  }

  private async extractSocialFindings(
    context: PipelineContext,
    audit: SocialProfileAudit
  ): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = []

    for (const theme of audit.contentThemes) {
      const finding = await createResearchFinding({
        tenantId: context.tenant.id,
        findingType: "content_pattern",
        findingCategory: "inferred",
        summary: `Content theme on ${audit.platform}: ${theme}`,
        details: { platform: audit.platform, theme },
        confidenceScore: audit.confidenceScore,
        relevanceScore: 0.7,
      })
      if (finding) findings.push(finding)
    }

    for (const strength of audit.platformStrengths) {
      const finding = await createResearchFinding({
        tenantId: context.tenant.id,
        findingType: "brand_signal",
        findingCategory: "inferred",
        summary: `${audit.platform} strength: ${strength}`,
        details: { platform: audit.platform, strength },
        confidenceScore: audit.confidenceScore,
        relevanceScore: 0.6,
      })
      if (finding) findings.push(finding)
    }

    return findings
  }

  private calculateOverallConfidence(findings: ResearchFinding[]): number {
    if (findings.length === 0) return 0.3

    const verifiedCount = findings.filter(f => f.findingCategory === "verified").length
    const totalCount = findings.length

    const verifiedRatio = verifiedCount / totalCount
    const avgConfidence = findings.reduce((sum, f) => sum + f.confidenceScore, 0) / totalCount

    return (verifiedRatio * 0.4) + (avgConfidence * 0.4) + (Math.min(totalCount / 10, 1) * 0.2)
  }

  private identifyResearchGaps(
    website: WebsiteAnalysis | null,
    audits: SocialProfileAudit[],
    findings: ResearchFinding[]
  ): string[] {
    const gaps: string[] = []

    if (!website) {
      gaps.push("No website data available for analysis")
    } else if (!website.aboutSection) {
      gaps.push("Website lacks clear about/mission section")
    }

    if (audits.length === 0) {
      gaps.push("No social media profiles analyzed")
    }

    const brandFindings = findings.filter(f => f.findingType === "brand_signal")
    if (brandFindings.length < 3) {
      gaps.push("Limited brand signals found - need more brand identity research")
    }

    const audienceFindings = findings.filter(f => f.findingType === "audience_signal")
    if (audienceFindings.length < 2) {
      gaps.push("Limited audience signals - relying more on user input")
    }

    const verifiedFindings = findings.filter(f => f.findingCategory === "verified")
    if (verifiedFindings.length < findings.length * 0.3) {
      gaps.push("Most findings are inferred rather than verified from research")
    }

    return gaps
  }
}

export const profileResearchAgent = new ProfileResearchAgent()
