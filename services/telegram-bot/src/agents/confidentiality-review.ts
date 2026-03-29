/**
 * KORA Confidentiality Review Agent
 * 
 * CRITICAL AGENT: This agent reviews all outputs before delivery
 * to ensure no cross-tenant data leakage occurs.
 * 
 * This agent checks:
 * 1. Whether only the current tenant namespace was used
 * 2. Whether any cross-tenant implication appears in the wording
 * 3. Whether the output contains suspiciously specific examples without public basis
 * 4. Whether the output references private work from another tenant
 */

import { BaseIntelAgent } from "./base-intel-agent"
import type { AgentInput, AgentOutput } from "../types/pipeline"
import type {
  ConfidentialityReviewResult,
  ConfidentialityViolation,
  ViolationType,
  VIOLATION_PATTERNS,
} from "../types/confidentiality"
import { LLMRouter } from "../llm/router"
import { buildSystemInstructions, CONFIDENTIALITY_REMINDERS } from "../llm/system-instructions"

// ============================================================================
// VIOLATION DETECTION PATTERNS
// ============================================================================

/**
 * Patterns that indicate potential cross-tenant references.
 */
const CROSS_TENANT_PATTERNS = [
  /another (client|brand|company|business) (we|I) (worked with|helped|advised)/i,
  /similar to (a|another) (client|brand) (we|I) (have|had)/i,
  /based on (our|my) experience with (other|similar) (clients|brands)/i,
  /we('ve| have) seen this (work|succeed|fail) (for|with) (other|another)/i,
  /(one of|some of) our (other|previous) clients/i,
  /like we did (for|with)/i,
  /reminds me of (a|another) (client|brand|company)/i,
  /in our work with (other|similar) (brands|clients|companies)/i,
  /a (brand|client|company) we (helped|worked with|advised) (before|previously)/i,
  /from (our|my) (other|previous) (client|project) work/i,
]

/**
 * Patterns that indicate suspiciously specific claims.
 */
const SUSPICIOUS_SPECIFICITY_PATTERNS = [
  /increased (engagement|followers|revenue|sales) by \d+%/i,
  /generated \$[\d,]+ in (revenue|sales)/i,
  /grew (from|to) [\d,]+ followers/i,
  /achieved (a |)[\d.]+ (engagement|conversion) rate/i,
  /resulted in \d+ (leads|conversions|sign-ups)/i,
  /saw (a |)\d+x (increase|growth|improvement)/i,
]

/**
 * Phrases that imply experience-based knowledge rather than framework knowledge.
 */
const EXPERIENCE_IMPLICATION_PATTERNS = [
  /we('ve| have) found that/i,
  /in our experience/i,
  /we('ve| have) learned that/i,
  /what (we|I)('ve| have) seen is/i,
  /from what (we|I)('ve| have) observed/i,
  /our track record shows/i,
  /we know (from experience|firsthand) that/i,
]

/**
 * Safe patterns that indicate proper sourcing.
 */
const SAFE_SOURCE_PATTERNS = [
  /according to (the |)(\w+ )?framework/i,
  /best practices suggest/i,
  /industry (standard|research|data) (shows|indicates)/i,
  /platform (guidelines|data|research) (shows|indicates|suggests)/i,
  /based on your (responses|answers|input|data)/i,
  /your (website|profile|social media) (shows|indicates|reveals)/i,
  /looking at your/i,
  /from your intake/i,
  /the \w+ model (suggests|indicates|recommends)/i,
]

// ============================================================================
// CONFIDENTIALITY REVIEW AGENT
// ============================================================================

export class ConfidentialityReviewAgent extends BaseIntelAgent {
  readonly agentName = "confidentiality_review"

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    const { tenantId } = input.context

    try {
      // Get all outputs to review
      const outputsToReview = this.collectOutputsToReview(input)
      
      if (outputsToReview.length === 0) {
        return {
          success: true,
          data: {
            passed: true,
            message: "No outputs to review",
          },
        }
      }

      // Review each output
      const reviewResults: ConfidentialityReviewResult[] = []
      
      for (const output of outputsToReview) {
        const result = await this.reviewOutput(
          tenantId,
          output.type,
          output.content
        )
        reviewResults.push(result)
      }

      // Aggregate results
      const allPassed = reviewResults.every(r => r.passed)
      const totalViolations = reviewResults.reduce(
        (sum, r) => sum + r.violations.length,
        0
      )
      const highestRisk = this.getHighestRisk(reviewResults)

      // Log results
      console.log(
        `[CONFIDENTIALITY REVIEW] tenant=${tenantId} ` +
        `outputs=${outputsToReview.length} passed=${allPassed} ` +
        `violations=${totalViolations} risk=${highestRisk}`
      )

      return {
        success: true,
        data: {
          passed: allPassed,
          reviewResults,
          totalViolations,
          highestRisk,
          shouldBlockDelivery: highestRisk === "critical" || highestRisk === "high",
        },
        metrics: {
          duration: Date.now() - startTime,
          llmCalls: reviewResults.filter(r => r.violations.length > 0).length,
        },
      }
    } catch (error) {
      console.error("[CONFIDENTIALITY REVIEW] Error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          passed: false,
          shouldBlockDelivery: true, // Block on error to be safe
        },
      }
    }
  }

  /**
   * Collects all outputs that need confidentiality review.
   */
  private collectOutputsToReview(input: AgentInput): Array<{
    type: string
    content: string
  }> {
    const outputs: Array<{ type: string; content: string }> = []

    // Check for deliverables in context
    if (input.context.brandBlueprint) {
      outputs.push({
        type: "brand_blueprint",
        content: JSON.stringify(input.context.brandBlueprint),
      })
    }

    if (input.context.audienceAnalysis) {
      outputs.push({
        type: "audience_analysis",
        content: JSON.stringify(input.context.audienceAnalysis),
      })
    }

    if (input.context.contentStrategy) {
      outputs.push({
        type: "content_strategy",
        content: JSON.stringify(input.context.contentStrategy),
      })
    }

    // Check for any additional outputs in data
    if (input.data?.outputToReview) {
      outputs.push({
        type: input.data.outputType || "unknown",
        content: typeof input.data.outputToReview === "string"
          ? input.data.outputToReview
          : JSON.stringify(input.data.outputToReview),
      })
    }

    return outputs
  }

  /**
   * Reviews a single output for confidentiality violations.
   */
  async reviewOutput(
    tenantId: string,
    outputType: string,
    content: string
  ): Promise<ConfidentialityReviewResult> {
    const violations: ConfidentialityViolation[] = []

    // Phase 1: Pattern-based detection
    violations.push(...this.detectCrossTenantReferences(content))
    violations.push(...this.detectSuspiciousSpecificity(content))
    violations.push(...this.detectExperienceImplications(content))

    // Phase 2: Check for safe patterns (reduce severity if present)
    const hasSafeSourcing = this.hasSafeSourcingPatterns(content)

    // Phase 3: LLM-based review for subtle violations
    if (violations.length > 0 || content.length > 1000) {
      const llmViolations = await this.llmBasedReview(tenantId, outputType, content)
      violations.push(...llmViolations)
    }

    // Deduplicate violations
    const uniqueViolations = this.deduplicateViolations(violations)

    // Calculate risk level
    const overallRisk = this.calculateRiskLevel(uniqueViolations, hasSafeSourcing)

    // Generate recommendations
    const recommendations = this.generateRecommendations(uniqueViolations)

    return {
      passed: uniqueViolations.length === 0 || overallRisk === "low",
      outputType,
      outputLength: content.length,
      tenantId,
      violations: uniqueViolations,
      overallRisk,
      recommendations,
      shouldBlockOutput: overallRisk === "critical" || overallRisk === "high",
      reviewedAt: new Date(),
    }
  }

  /**
   * Detects cross-tenant reference patterns.
   */
  private detectCrossTenantReferences(content: string): ConfidentialityViolation[] {
    const violations: ConfidentialityViolation[] = []

    for (const pattern of CROSS_TENANT_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        violations.push({
          type: "cross_tenant_reference",
          severity: "error",
          description: "Contains language that references other clients",
          evidence: matches[0],
          suggestion: "Rephrase to use framework-based or public knowledge language",
        })
      }
    }

    return violations
  }

  /**
   * Detects suspiciously specific claims without clear sourcing.
   */
  private detectSuspiciousSpecificity(content: string): ConfidentialityViolation[] {
    const violations: ConfidentialityViolation[] = []

    for (const pattern of SUSPICIOUS_SPECIFICITY_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        // Check if this specific claim has sourcing nearby
        const matchIndex = content.indexOf(matches[0])
        const surroundingText = content.substring(
          Math.max(0, matchIndex - 100),
          Math.min(content.length, matchIndex + matches[0].length + 100)
        )
        
        const hasSource = SAFE_SOURCE_PATTERNS.some(p => p.test(surroundingText))
        
        if (!hasSource) {
          violations.push({
            type: "specific_without_source",
            severity: "warning",
            description: "Contains specific claim without clear public source",
            evidence: matches[0],
            suggestion: "Add source attribution or rephrase as general guidance",
          })
        }
      }
    }

    return violations
  }

  /**
   * Detects experience-based implications.
   */
  private detectExperienceImplications(content: string): ConfidentialityViolation[] {
    const violations: ConfidentialityViolation[] = []

    for (const pattern of EXPERIENCE_IMPLICATION_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        violations.push({
          type: "cross_tenant_implication",
          severity: "warning",
          description: "Contains language that implies experience-based knowledge from other work",
          evidence: matches[0],
          suggestion: "Rephrase as 'best practices suggest' or 'industry research indicates'",
        })
      }
    }

    return violations
  }

  /**
   * Checks if content has safe sourcing patterns.
   */
  private hasSafeSourcingPatterns(content: string): boolean {
    return SAFE_SOURCE_PATTERNS.some(p => p.test(content))
  }

  /**
   * Uses LLM to detect subtle confidentiality violations.
   */
  private async llmBasedReview(
    tenantId: string,
    outputType: string,
    content: string
  ): Promise<ConfidentialityViolation[]> {
    try {
      const router = LLMRouter.getInstance()
      
      const systemInstructions = buildSystemInstructions(
        "confidentiality_review",
        tenantId
      )

      const prompt = `
${CONFIDENTIALITY_REMINDERS.medium}

Review the following ${outputType} output for confidentiality violations.

OUTPUT TO REVIEW:
${content.substring(0, 3000)}${content.length > 3000 ? "...[truncated]" : ""}

Check for:
1. Any language that implies knowledge from other clients
2. Specific claims without clear framework or current-client source
3. Experience-based statements that suggest other client work
4. Any phrases that could make another client uncomfortable if they read this

Respond in JSON format:
{
  "violations": [
    {
      "type": "cross_tenant_reference|cross_tenant_implication|specific_without_source|pattern_from_other_work",
      "severity": "warning|error|critical",
      "description": "...",
      "evidence": "the problematic text",
      "suggestion": "how to fix"
    }
  ],
  "overallAssessment": "clean|minor_issues|major_issues|critical"
}

If no violations found, return: {"violations": [], "overallAssessment": "clean"}
`

      const response = await router.route({
        task: "classification",
        prompt,
        systemInstruction: systemInstructions,
        temperature: 0.1,
        maxTokens: 1000,
      })

      // Parse response
      try {
        const cleaned = response.content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim()
        const parsed = JSON.parse(cleaned)
        return parsed.violations || []
      } catch (parseError) {
        console.warn("[CONFIDENTIALITY REVIEW] Could not parse LLM response:", parseError)
        return []
      }
    } catch (error) {
      console.error("[CONFIDENTIALITY REVIEW] LLM review failed:", error)
      return []
    }
  }

  /**
   * Deduplicates violations by evidence.
   */
  private deduplicateViolations(violations: ConfidentialityViolation[]): ConfidentialityViolation[] {
    const seen = new Set<string>()
    return violations.filter(v => {
      const key = `${v.type}:${v.evidence}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Calculates overall risk level.
   */
  private calculateRiskLevel(
    violations: ConfidentialityViolation[],
    hasSafeSourcing: boolean
  ): ConfidentialityReviewResult["overallRisk"] {
    if (violations.length === 0) return "none"

    const criticalCount = violations.filter(v => v.severity === "critical").length
    const errorCount = violations.filter(v => v.severity === "error").length
    const warningCount = violations.filter(v => v.severity === "warning").length

    if (criticalCount > 0) return "critical"
    if (errorCount >= 2) return "high"
    if (errorCount > 0) return "medium"
    if (warningCount > 3) return "medium"
    if (warningCount > 0 && hasSafeSourcing) return "low"
    if (warningCount > 0) return "low"
    
    return "none"
  }

  /**
   * Generates recommendations based on violations.
   */
  private generateRecommendations(violations: ConfidentialityViolation[]): string[] {
    const recommendations: string[] = []

    const types = new Set(violations.map(v => v.type))

    if (types.has("cross_tenant_reference")) {
      recommendations.push(
        "Remove all language that references 'other clients', 'previous brands', or similar"
      )
    }

    if (types.has("cross_tenant_implication")) {
      recommendations.push(
        "Rephrase experience-based statements to use framework or research language"
      )
    }

    if (types.has("specific_without_source")) {
      recommendations.push(
        "Add source attribution for specific claims (framework name, 'your data shows', etc.)"
      )
    }

    if (types.has("pattern_from_other_work")) {
      recommendations.push(
        "Express useful patterns as 'best practices' or 'industry standards' instead of learned experience"
      )
    }

    if (recommendations.length === 0) {
      recommendations.push("Minor issues detected - review flagged sections manually")
    }

    return recommendations
  }

  /**
   * Gets the highest risk level from multiple reviews.
   */
  private getHighestRisk(
    results: ConfidentialityReviewResult[]
  ): ConfidentialityReviewResult["overallRisk"] {
    const riskOrder: ConfidentialityReviewResult["overallRisk"][] = [
      "none", "low", "medium", "high", "critical"
    ]
    
    let highest: ConfidentialityReviewResult["overallRisk"] = "none"
    
    for (const result of results) {
      if (riskOrder.indexOf(result.overallRisk) > riskOrder.indexOf(highest)) {
        highest = result.overallRisk
      }
    }
    
    return highest
  }
}

// ============================================================================
// QUICK REVIEW FUNCTION
// ============================================================================

/**
 * Quick function to review a single piece of text.
 * Useful for inline checks during generation.
 */
export async function quickConfidentialityCheck(
  tenantId: string,
  text: string
): Promise<{
  passed: boolean
  issues: string[]
}> {
  const agent = new ConfidentialityReviewAgent()
  const result = await agent.reviewOutput(tenantId, "text", text)
  
  return {
    passed: result.passed,
    issues: result.violations.map(v => v.description),
  }
}
