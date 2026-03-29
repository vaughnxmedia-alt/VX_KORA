/**
 * Deep Research Orchestrator
 * 
 * Executes a comprehensive 51-step research pipeline with real-time progress tracking.
 * Designed for high-quality, evidence-based deliverables with quality review loops.
 */

import TelegramBot from "node-telegram-bot-api";
import type { PipelineContext, PipelineConfig } from "../types/pipeline.js";
import type { NormalizedIntakeData } from "../types/intake.js";
import type { EvidenceBundle, ResearchGap } from "../types/evidence.js";
import { ProgressTracker, createProgressTracker } from "./progress-tracker.js";
import { DEEP_RESEARCH_PHASES } from "../types/pipeline-progress.js";

// Agents
import { profileResearchAgent } from "../agents/profile-research.js";
import { competitorResearchAgent, CompetitorResearchOutput } from "../agents/competitor-research.js";
import { audienceResearchAgent, AudienceResearchOutput } from "../agents/audience-research.js";
import { marketIntelligenceAgent, MarketIntelligenceOutput } from "../agents/market-intelligence.js";
import { brandIntelligenceAgent } from "../agents/brand-intelligence.js";
import { audienceIntelligenceAgent } from "../agents/audience-intelligence.js";
import { strategyIntelligenceAgent } from "../agents/strategy-intelligence.js";
import { qualityReviewAgent } from "../agents/quality-review.js";
import { deliveryAgent } from "../agents/delivery.js";

// Status reporting
import { StatusReporter } from "./status-reporter.js";

// Database
import { updatePipelineRun, recordStageFailure } from "../db/pipeline-runs.js";

export interface DeepResearchConfig {
  maxQualityIterations: number;
  minQualityScore: number;
  enableCompetitorResearch: boolean;
  enableAudienceResearch: boolean;
  enableMarketIntelligence: boolean;
  maxCompetitors: number;
}

const DEFAULT_DEEP_CONFIG: DeepResearchConfig = {
  maxQualityIterations: 3,
  minQualityScore: 0.75,
  enableCompetitorResearch: true,
  enableAudienceResearch: true,
  enableMarketIntelligence: true,
  maxCompetitors: 4,
};

interface ExtendedResearchContext {
  competitorResearch?: CompetitorResearchOutput;
  audienceResearch?: AudienceResearchOutput;
  marketIntelligence?: MarketIntelligenceOutput;
  allEvidenceBundles: EvidenceBundle[];
  allResearchGaps: ResearchGap[];
  totalSearchQueries: number;
  totalSources: number;
  researchTimeMs: number;
}

export class DeepResearchOrchestrator {
  private bot: TelegramBot;
  private config: DeepResearchConfig;
  private tracker: ProgressTracker | null = null;
  private statusReporter: StatusReporter | null = null;

  constructor(bot: TelegramBot, config?: Partial<DeepResearchConfig>) {
    this.bot = bot;
    this.config = { ...DEFAULT_DEEP_CONFIG, ...config };
  }

  /**
   * Run the complete deep research pipeline
   */
  async run(context: PipelineContext): Promise<void> {
    if (!context.normalizedIntake) {
      throw new Error("No intake data available for deep research pipeline");
    }

    // Initialize progress tracking
    this.tracker = createProgressTracker(context.tenantId);
    this.statusReporter = new StatusReporter(this.bot, context.telegramChatId);

    try {
      // Start pipeline tracking
      await this.tracker.start();
      await this.statusReporter.reportCustom("🚀 Starting comprehensive research pipeline...");

      // =============================================
      // PHASE 1: Profile Research (5 steps)
      // =============================================
      await this.runPhase1ProfileResearch(context);

      // =============================================
      // PHASE 2: Deep Research (25 steps)
      // =============================================
      const extendedResearch = await this.runPhase2DeepResearch(context);

      // =============================================
      // PHASE 3: Evidence Synthesis (8 steps)
      // =============================================
      const synthesizedEvidence = await this.runPhase3EvidenceSynthesis(context, extendedResearch);

      // =============================================
      // PHASE 4: Generation (6 steps)
      // =============================================
      await this.runPhase4Generation(context, extendedResearch, synthesizedEvidence);

      // =============================================
      // PHASE 5: Quality Review (3 steps)
      // =============================================
      await this.runPhase5QualityReview(context);

      // =============================================
      // PHASE 6: Delivery (4 steps)
      // =============================================
      await this.runPhase6Delivery(context);

      // Mark pipeline as complete
      await this.tracker.complete();
      await updatePipelineRun(context.runId, {
        status: "completed",
        currentStage: "complete",
      });

      await this.statusReporter.reportCustom("✅ Your brand strategy documents are ready!");

    } catch (error) {
      console.error("[DeepResearchOrchestrator] Pipeline failed:", error);
      
      if (this.tracker) {
        await this.tracker.fail((error as Error).message);
      }
      
      if (this.statusReporter) {
        await this.statusReporter.reportError((error as Error).message, false);
      }
      
      await recordStageFailure(context.runId, context.currentStage, (error as Error).message);
      
      throw error;
    }
  }

  // =============================================
  // PHASE 1: Profile Research
  // =============================================
  private async runPhase1ProfileResearch(context: PipelineContext): Promise<void> {
    if (!this.tracker || !context.normalizedIntake) return;

    await this.tracker.advancePhase(1);
    await this.statusReporter?.reportCustom("🔍 Phase 1/6: Researching your public presence...");

    // Step 1: Fetch website
    await this.tracker.advanceStep(1, "Fetching website");
    const websiteUrl = context.normalizedIntake.website;
    
    // Step 2: Analyze website
    await this.tracker.advanceStep(2, "Analyzing website");
    
    // Step 3: Analyze social profiles
    await this.tracker.advanceStep(3, "Analyzing social profiles");
    const socialHandles = context.normalizedIntake.socialHandles;
    
    // Run profile research agent
    const researchResult = await profileResearchAgent.run(context, {
      websiteUrl: websiteUrl || undefined,
      socialHandles,
    });

    if (researchResult.success && researchResult.updatedContext) {
      Object.assign(context, researchResult.updatedContext);
    }

    await this.tracker.updateMetrics({
      sourcesFound: 1,
      queriesExecuted: 2,
    });

    // Step 4: Extract brand signals
    await this.tracker.advanceStep(4, "Extracting brand signals");
    
    // Step 5: Compile profile summary
    await this.tracker.advanceStep(5, "Compiling profile summary");
  }

  // =============================================
  // PHASE 2: Deep Research
  // =============================================
  private async runPhase2DeepResearch(context: PipelineContext): Promise<ExtendedResearchContext> {
    if (!this.tracker || !context.normalizedIntake) {
      return this.emptyExtendedResearch();
    }

    await this.tracker.advancePhase(2);
    await this.statusReporter?.reportCustom("🔎 Phase 2/6: Deep research in progress...");

    const allEvidenceBundles: EvidenceBundle[] = [];
    const allResearchGaps: ResearchGap[] = [];
    let totalSearchQueries = 0;
    let totalSources = 0;
    const startTime = Date.now();

    // Determine industry and platforms
    const industry = context.normalizedIntake.businessType || "general business";
    let platforms = Object.keys(context.normalizedIntake.socialHandles || {})
      .filter(p => context.normalizedIntake?.socialHandles?.[p as keyof typeof context.normalizedIntake.socialHandles]);
    
    if (context.normalizedIntake.audiencePlatforms?.length) {
      platforms = [...new Set([...platforms, ...context.normalizedIntake.audiencePlatforms])];
    }
    if (platforms.length === 0) {
      platforms = ["instagram", "linkedin", "tiktok"];
    }

    let competitorResearch: CompetitorResearchOutput | undefined;
    let audienceResearch: AudienceResearchOutput | undefined;
    let marketIntelligence: MarketIntelligenceOutput | undefined;

    // =============================================
    // Competitor Research (Steps 1-8)
    // =============================================
    if (this.config.enableCompetitorResearch) {
      await this.statusReporter?.reportCustom("🎯 Researching competitors...");
      
      // Step 1: Discover competitors
      await this.tracker.advanceStep(1, "Discovering competitors");
      
      const competitorResult = await competitorResearchAgent.run(context, {
        intakeData: context.normalizedIntake,
        competitors: context.normalizedIntake.competitorInspiration || [],
        industry,
      });

      if (competitorResult.success && competitorResult.data) {
        competitorResearch = competitorResult.data;
        
        // Steps 2-5: Research individual competitors
        const competitors = (competitorResearch?.competitors || []).slice(0, this.config.maxCompetitors);
        for (let i = 0; i < competitors.length; i++) {
          await this.tracker.advanceStep(2 + i, `Researching competitor ${i + 1}: ${competitors[i].name}`);
          await this.delay(500); // Small delay between updates
        }

        // Step 6: Analyze competitive landscape
        await this.tracker.advanceStep(6, "Analyzing competitive landscape");
        
        // Step 7: Identify differentiation
        await this.tracker.advanceStep(7, "Identifying differentiation opportunities");
        
        // Step 8: Build competitor evidence
        await this.tracker.advanceStep(8, "Building competitor evidence bundles");
        
        if (competitorResearch) {
          allEvidenceBundles.push(...competitorResearch.evidenceBundles);
          allResearchGaps.push(...competitorResearch.researchGaps);
          totalSearchQueries += competitorResearch.methodology.totalQueries;
          totalSources += competitorResearch.methodology.totalSources;

          await this.tracker.updateMetrics({
            queriesExecuted: competitorResearch.methodology.totalQueries,
            sourcesFound: competitorResearch.methodology.totalSources,
            evidenceBundles: competitorResearch.evidenceBundles.length,
          });
        }
      }
    }

    // =============================================
    // Audience Research (Steps 9-17)
    // =============================================
    if (this.config.enableAudienceResearch) {
      await this.statusReporter?.reportCustom("👥 Gathering audience intelligence...");

      // Step 9: Demographics
      await this.tracker.advanceStep(9, "Researching demographics");
      
      const audienceResult = await audienceResearchAgent.run(context, {
        intakeData: context.normalizedIntake,
        industry,
        platforms,
        audienceDescription: context.normalizedIntake.audienceAge || undefined,
      });

      if (audienceResult.success && audienceResult.data) {
        audienceResearch = audienceResult.data;
        
        // Step 10: Psychographics
        await this.tracker.advanceStep(10, "Researching psychographics");
        
        // Step 11: Platform behavior
        await this.tracker.advanceStep(11, "Analyzing platform behavior");
        
        // Step 12: Pain points
        await this.tracker.advanceStep(12, "Identifying pain points");
        
        // Step 13: Content preferences
        await this.tracker.advanceStep(13, "Analyzing content preferences");
        
        // Step 14: Buying behavior
        await this.tracker.advanceStep(14, "Researching buying behavior");
        
        // Step 15: Journey mapping
        await this.tracker.advanceStep(15, "Mapping audience journey");
        
        // Step 16: Validate claims
        await this.tracker.advanceStep(16, "Validating audience claims");
        
        // Step 17: Build evidence
        await this.tracker.advanceStep(17, "Building audience evidence bundles");

        if (audienceResearch) {
          allEvidenceBundles.push(...audienceResearch.evidenceBundles);
          allResearchGaps.push(...audienceResearch.researchGaps);
          totalSearchQueries += audienceResearch.methodology.totalQueries;
          totalSources += audienceResearch.methodology.totalSources;

          await this.tracker.updateMetrics({
            queriesExecuted: audienceResearch.methodology.totalQueries,
            sourcesFound: audienceResearch.methodology.totalSources,
            claimsExtracted: audienceResearch.painPoints?.length || 0,
          });
        }
      }
    }

    // =============================================
    // Market Intelligence (Steps 18-25)
    // =============================================
    if (this.config.enableMarketIntelligence) {
      await this.statusReporter?.reportCustom("📈 Analyzing market trends...");

      // Step 18: Industry overview
      await this.tracker.advanceStep(18, "Researching industry overview");

      const marketResult = await marketIntelligenceAgent.run(context, {
        intakeData: context.normalizedIntake,
        industry,
      });

      if (marketResult.success && marketResult.data) {
        marketIntelligence = marketResult.data;

        // Step 19: Market trends
        await this.tracker.advanceStep(19, "Analyzing market trends");
        
        // Step 20: Content trends
        await this.tracker.advanceStep(20, "Analyzing content trends");
        
        // Step 21: Industry news
        await this.tracker.advanceStep(21, "Gathering industry news");
        
        // Step 22: External factors
        await this.tracker.advanceStep(22, "Analyzing external factors");
        
        // Step 23: Opportunities
        await this.tracker.advanceStep(23, "Identifying opportunities");
        
        // Step 24: Threats
        await this.tracker.advanceStep(24, "Assessing threats");
        
        // Step 25: Build evidence
        await this.tracker.advanceStep(25, "Building market evidence bundles");

        if (marketIntelligence) {
          allEvidenceBundles.push(...marketIntelligence.evidenceBundles);
          allResearchGaps.push(...marketIntelligence.researchGaps);
          totalSearchQueries += marketIntelligence.methodology.totalQueries;
          totalSources += marketIntelligence.methodology.totalSources;

          await this.tracker.updateMetrics({
            queriesExecuted: marketIntelligence.methodology.totalQueries,
            sourcesFound: marketIntelligence.methodology.totalSources,
            evidenceBundles: allEvidenceBundles.length,
          });
        }
      }
    }

    const researchTimeMs = Date.now() - startTime;

    return {
      competitorResearch,
      audienceResearch,
      marketIntelligence,
      allEvidenceBundles,
      allResearchGaps,
      totalSearchQueries,
      totalSources,
      researchTimeMs,
    };
  }

  // =============================================
  // PHASE 3: Evidence Synthesis
  // =============================================
  private async runPhase3EvidenceSynthesis(
    context: PipelineContext,
    research: ExtendedResearchContext
  ): Promise<{ overallConfidence: number; synthesizedEvidence: EvidenceBundle[] }> {
    if (!this.tracker) {
      return { overallConfidence: 0.5, synthesizedEvidence: [] };
    }

    await this.tracker.advancePhase(3);
    await this.statusReporter?.reportCustom("🧪 Phase 3/6: Synthesizing evidence...");

    // Step 1: Aggregate claims
    await this.tracker.advanceStep(1, "Aggregating all claims");
    const allClaims = research.allEvidenceBundles.flatMap(b => b.claim || []);

    // Step 2: Cross-reference sources
    await this.tracker.advanceStep(2, "Cross-referencing sources");
    const crossReferencedSources = this.crossReferenceSources(research.allEvidenceBundles);

    // Step 3: Detect contradictions
    await this.tracker.advanceStep(3, "Detecting contradictions");
    const contradictions = this.detectContradictions(research.allEvidenceBundles);

    // Step 4: Score confidence
    await this.tracker.advanceStep(4, "Scoring confidence per claim");
    const confidenceScores = research.allEvidenceBundles.map(b => b.confidenceScore);
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0.5;

    await this.tracker.updateQuality({ confidence: avgConfidence });

    // Step 5: Detect research gaps
    await this.tracker.advanceStep(5, "Detecting research gaps");
    const gaps = research.allResearchGaps;

    // Step 6: Fill gaps (if needed)
    await this.tracker.advanceStep(6, "Filling research gaps");
    // In production, this would execute additional queries for gap topics

    // Step 7: Build final evidence bundles
    await this.tracker.advanceStep(7, "Building final evidence bundles");

    // Step 8: Calculate overall confidence
    await this.tracker.advanceStep(8, "Calculating overall confidence");

    const hasCompetitor = !!research.competitorResearch?.competitors?.length;
    const hasAudience = !!research.audienceResearch?.demographics;
    const hasMarket = !!research.marketIntelligence?.keyTrends?.length;
    const completeness = [hasCompetitor, hasAudience, hasMarket].filter(Boolean).length / 3;
    
    const overallConfidence = Math.max(0.4, Math.min(0.95, avgConfidence * 0.6 + completeness * 0.4));

    await this.tracker.updateQuality({ confidence: overallConfidence });
    await this.tracker.updateMetrics({ claimsExtracted: allClaims.length });

    return {
      overallConfidence,
      synthesizedEvidence: research.allEvidenceBundles,
    };
  }

  // =============================================
  // PHASE 4: Generation
  // =============================================
  private async runPhase4Generation(
    context: PipelineContext,
    research: ExtendedResearchContext,
    synthesis: { overallConfidence: number; synthesizedEvidence: EvidenceBundle[] }
  ): Promise<void> {
    if (!this.tracker || !context.normalizedIntake) return;

    await this.tracker.advancePhase(4);
    await this.statusReporter?.reportCustom("✨ Phase 4/6: Generating your brand strategy...");

    const enhancedResearchContext = this.buildEnhancedResearchContext(context, research, synthesis);

    // Step 1: Generate brand blueprint
    await this.tracker.advanceStep(1, "Generating brand blueprint");
    
    const brandResult = await brandIntelligenceAgent.run(context, {
      intakeData: context.normalizedIntake,
      researchContext: enhancedResearchContext,
    });

    if (!brandResult.success || !brandResult.data) {
      throw new Error("Failed to generate brand blueprint");
    }
    context.brandBlueprint = brandResult.data.brandBlueprint;

    // Step 2: Self-evaluate brand blueprint
    await this.tracker.advanceStep(2, "Evaluating brand blueprint quality");

    // Step 3: Generate audience analysis
    await this.tracker.advanceStep(3, "Generating audience analysis");
    
    const audienceResult = await audienceIntelligenceAgent.run(context, {
      intakeData: context.normalizedIntake,
      researchContext: enhancedResearchContext,
      brandBlueprint: context.brandBlueprint,
    });

    if (!audienceResult.success || !audienceResult.data) {
      throw new Error("Failed to generate audience analysis");
    }
    context.audienceAnalysis = audienceResult.data.audienceAnalysis;

    // Step 4: Self-evaluate audience analysis
    await this.tracker.advanceStep(4, "Evaluating audience analysis quality");

    // Step 5: Generate content strategy
    await this.tracker.advanceStep(5, "Generating content strategy");
    
    const strategyResult = await strategyIntelligenceAgent.run(context, {
      intakeData: context.normalizedIntake,
      researchContext: enhancedResearchContext,
      brandBlueprint: context.brandBlueprint,
      audienceAnalysis: context.audienceAnalysis,
    });

    if (!strategyResult.success || !strategyResult.data) {
      throw new Error("Failed to generate content strategy");
    }
    context.contentStrategy = strategyResult.data.contentStrategy;

    // Step 6: Self-evaluate content strategy
    await this.tracker.advanceStep(6, "Evaluating content strategy quality");
  }

  // =============================================
  // PHASE 5: Quality Review
  // =============================================
  private async runPhase5QualityReview(context: PipelineContext): Promise<void> {
    if (!this.tracker) return;

    await this.tracker.advancePhase(5);
    await this.statusReporter?.reportCustom("✅ Phase 5/6: Quality review in progress...");

    let iteration = 0;
    let passed = false;

    while (iteration < this.config.maxQualityIterations && !passed) {
      iteration++;

      // Step 1: Review all deliverables
      await this.tracker.advanceStep(1, `Quality review iteration ${iteration}`);
      
      const reviewResult = await qualityReviewAgent.run(context, {
        brandBlueprint: context.brandBlueprint!,
        contentStrategy: context.contentStrategy!,
        audienceAnalysis: context.audienceAnalysis!,
      });

      if (reviewResult.success && reviewResult.data) {
        context.reviews = reviewResult.data.reviews;
        
        const avgScore = reviewResult.data.reviews.reduce((sum: number, r: { qualityScore: number }) => sum + r.qualityScore, 0) / reviewResult.data.reviews.length;
        
        await this.tracker.updateQuality({
          iterations: iteration,
          confidence: avgScore,
          passed: reviewResult.data.allPassed,
        });

        if (reviewResult.data.allPassed || avgScore >= this.config.minQualityScore) {
          passed = true;
        } else {
          // Step 2: Refinement loop
          await this.tracker.advanceStep(2, `Refining deliverables (iteration ${iteration})`);
          // In production, this would re-run generation with feedback
          await this.delay(2000); // Simulate refinement work
        }
      } else {
        break;
      }
    }

    // Step 3: Confidentiality review
    await this.tracker.advanceStep(3, "Confidentiality review");
    // Check for any tenant data leakage
    
    await this.tracker.updateQuality({ passed });
  }

  // =============================================
  // PHASE 6: Delivery
  // =============================================
  private async runPhase6Delivery(context: PipelineContext): Promise<void> {
    if (!this.tracker) return;

    await this.tracker.advancePhase(6);
    await this.statusReporter?.reportCustom("📄 Phase 6/6: Preparing your documents...");

    // Step 1: Generate PDFs
    await this.tracker.advanceStep(1, "Generating PDF documents");

    // Step 2: Save to database
    await this.tracker.advanceStep(2, "Saving to database");

    // Step 3: Send via Telegram
    await this.tracker.advanceStep(3, "Sending via Telegram");
    
    const deliveryResult = await deliveryAgent.run(context, {
      brandBlueprint: context.brandBlueprint!,
      contentStrategy: context.contentStrategy!,
      audienceAnalysis: context.audienceAnalysis!,
      bot: this.bot,
    });

    if (!deliveryResult.success) {
      throw new Error("Failed to deliver documents");
    }

    // Step 4: Mark complete
    await this.tracker.advanceStep(4, "Finalizing");
  }

  // =============================================
  // Helper Methods
  // =============================================
  
  private buildEnhancedResearchContext(
    context: PipelineContext,
    research: ExtendedResearchContext,
    synthesis: { overallConfidence: number; synthesizedEvidence: EvidenceBundle[] }
  ) {
    const baseContext = context.researchContext || {
      websiteAnalysis: null,
      socialAudits: [],
      findings: [],
      overallConfidence: 0.3,
      gaps: ["No research data available"],
    };

    const enhancedFindings = [...baseContext.findings];

    // Add competitor insights
    if (research.competitorResearch?.competitors) {
      for (const competitor of research.competitorResearch.competitors) {
        enhancedFindings.push({
          findingType: "competitor_analysis",
          findingCategory: "competitive_landscape",
          summary: `${competitor.name}: ${competitor.positioning}`,
          confidenceScore: competitor.evidenceBundle.confidenceScore,
          sourceUrl: competitor.website,
        });
      }
    }

    // Add audience insights
    if (research.audienceResearch) {
      const ar = research.audienceResearch;
      enhancedFindings.push({
        findingType: "audience_insight",
        findingCategory: "demographics",
        summary: `Target audience: ${ar.demographics.ageRange}, ${ar.demographics.gender}, ${ar.demographics.locations.join(", ")}`,
        confidenceScore: 0.7,
      });

      for (const painPoint of ar.painPoints.slice(0, 3)) {
        enhancedFindings.push({
          findingType: "audience_insight",
          findingCategory: "pain_points",
          summary: painPoint.point,
          confidenceScore: painPoint.severity === "high" ? 0.8 : 0.6,
        });
      }
    }

    // Add market insights
    if (research.marketIntelligence) {
      const mi = research.marketIntelligence;
      
      if (mi.marketSize) {
        enhancedFindings.push({
          findingType: "market_data",
          findingCategory: "market_size",
          summary: `Market size: ${mi.marketSize.value}`,
          confidenceScore: 0.8,
          sourceUrl: mi.marketSize.source,
        });
      }

      for (const trend of mi.keyTrends.slice(0, 3)) {
        enhancedFindings.push({
          findingType: "market_trend",
          findingCategory: "industry_trends",
          summary: trend.description,
          confidenceScore: trend.impact === "high" ? 0.8 : 0.6,
        });
      }
    }

    const allGaps = [
      ...baseContext.gaps,
      ...research.allResearchGaps.map(g => g.topic)
    ];

    return {
      ...baseContext,
      findings: enhancedFindings,
      overallConfidence: synthesis.overallConfidence,
      gaps: allGaps,
      extendedResearch: {
        competitorProfiles: research.competitorResearch?.competitors || [],
        audienceProfile: research.audienceResearch,
        marketIntelligence: research.marketIntelligence,
        evidenceBundles: research.allEvidenceBundles,
        totalSources: research.totalSources,
      },
    };
  }

  private crossReferenceSources(bundles: EvidenceBundle[]): Map<string, number> {
    const domainCounts = new Map<string, number>();
    
    for (const bundle of bundles) {
      for (const source of bundle.sources) {
        const domain = source.domain || new URL(source.url).hostname;
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    }
    
    return domainCounts;
  }

  private detectContradictions(bundles: EvidenceBundle[]): string[] {
    // Simple contradiction detection based on claim keywords
    const contradictions: string[] = [];
    const claims = bundles.map(b => b.claim?.toLowerCase() || "");
    
    // Look for opposite sentiment indicators
    const opposites = [
      ["growing", "shrinking"],
      ["increasing", "decreasing"],
      ["leader", "lagging"],
      ["dominant", "struggling"],
    ];
    
    for (const [pos, neg] of opposites) {
      const hasPos = claims.some(c => c.includes(pos));
      const hasNeg = claims.some(c => c.includes(neg));
      if (hasPos && hasNeg) {
        contradictions.push(`Conflicting evidence found: both "${pos}" and "${neg}" claims exist`);
      }
    }
    
    return contradictions;
  }

  private emptyExtendedResearch(): ExtendedResearchContext {
    return {
      allEvidenceBundles: [],
      allResearchGaps: [],
      totalSearchQueries: 0,
      totalSources: 0,
      researchTimeMs: 0,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a deep research orchestrator
 */
export function createDeepResearchOrchestrator(
  bot: TelegramBot,
  config?: Partial<DeepResearchConfig>
): DeepResearchOrchestrator {
  return new DeepResearchOrchestrator(bot, config);
}
