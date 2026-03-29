/**
 * KORA Agent Context Builder
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * This module builds the complete context an agent needs to perform its task.
 * It clearly separates:
 * 
 * 1. Core Brain context (global, reusable)
 * 2. Tenant Brain context (private, isolated)
 * 3. System instructions with confidentiality rules
 * 
 * CRITICAL: Contexts are NEVER mixed between tenants.
 */

import { loadCoreBrainForTask, type CoreBrainData } from "../db/core-brain"
import { retrieveDeliverableContext, separateResultsByNamespace } from "./retriever"
import { getDefaultConfidentialityRules, type ConfidentialityRules } from "../types/confidentiality"
import type { DeliverableTypeOrAll, SocialPlatform, CoreBrainContext } from "../types/core-brain"
import type { TenantBrainContext } from "../types/tenant-brain"

// ============================================================================
// AGENT CONTEXT TYPE
// ============================================================================

/**
 * Complete context provided to an agent for a task.
 * Clearly separates global and tenant-specific knowledge.
 */
export interface AgentContext {
  // Identity
  agentName: string
  tenantId: string
  
  // Core Brain (global, reusable knowledge)
  coreBrain: CoreBrainContext
  
  // Tenant Brain (private, this tenant only)
  tenantBrain: TenantBrainContext
  
  // Confidentiality rules for this context
  confidentialityRules: ConfidentialityRules
  
  // System instructions with confidentiality reminder
  systemInstructions: string
  
  // Formatted context for prompt inclusion
  formattedContext: {
    globalKnowledge: string
    tenantKnowledge: string
    combined: string
  }
}

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Builds complete agent context from Core Brain and Tenant Brain.
 * 
 * CONFIDENTIALITY: All tenant data is scoped to the specified tenant only.
 */
export async function buildAgentContext(
  agentName: string,
  tenantId: string,
  options: {
    deliverableType: DeliverableTypeOrAll
    industry?: string
    platforms?: SocialPlatform[]
  }
): Promise<AgentContext> {
  // CRITICAL: Validate tenant_id
  if (!tenantId) {
    throw new Error("[CONFIDENTIALITY VIOLATION] buildAgentContext requires tenant_id")
  }

  // Get confidentiality rules for this tenant
  const confidentialityRules = getDefaultConfidentialityRules(tenantId)

  // Retrieve all context
  const contextData = await retrieveDeliverableContext(
    tenantId,
    options.deliverableType,
    {
      industry: options.industry,
      platforms: options.platforms,
    }
  )

  // Build Core Brain context (global)
  const coreBrainContext = buildCoreBrainContext(
    contextData.coreBrain,
    options.platforms
  )

  // Build Tenant Brain context (private)
  const tenantBrainContext = buildTenantBrainContext(
    tenantId,
    contextData
  )

  // Build system instructions with confidentiality reminder
  const systemInstructions = buildSystemInstructions(agentName, confidentialityRules)

  // Format context for prompt inclusion
  const formattedContext = formatContextForPrompt(
    coreBrainContext,
    tenantBrainContext,
    options.deliverableType
  )

  console.log(
    `[CONTEXT BUILT] agent=${agentName} tenant=${tenantId} ` +
    `global_len=${formattedContext.globalKnowledge.length} ` +
    `tenant_len=${formattedContext.tenantKnowledge.length}`
  )

  return {
    agentName,
    tenantId,
    coreBrain: coreBrainContext,
    tenantBrain: tenantBrainContext,
    confidentialityRules,
    systemInstructions,
    formattedContext,
  }
}

// ============================================================================
// CORE BRAIN CONTEXT BUILDER
// ============================================================================

function buildCoreBrainContext(
  data: CoreBrainData,
  platforms?: SocialPlatform[]
): CoreBrainContext {
  const platformMap = new Map<SocialPlatform, typeof data.platformKnowledge[0]>()
  for (const pk of data.platformKnowledge) {
    platformMap.set(pk.platform, pk)
  }

  return {
    applicableFrameworks: data.frameworks,
    platformKnowledge: platformMap,
    industryKnowledge: data.industryKnowledge[0], // First match if any
    scoringRules: data.scoringRules,
    outputTemplate: undefined, // Loaded separately if needed
    systemInstructions: "", // Built separately
    confidentialityReminder: CONFIDENTIALITY_REMINDER,
  }
}

// ============================================================================
// TENANT BRAIN CONTEXT BUILDER
// ============================================================================

function buildTenantBrainContext(
  tenantId: string,
  data: Awaited<ReturnType<typeof retrieveDeliverableContext>>
): TenantBrainContext {
  return {
    tenantId,
    
    intakeAnswers: data.intakeAnswers.map(a => ({
      questionId: a.questionId,
      questionText: a.questionText,
      answer: a.rawAnswer,
      answerType: a.answerType as any,
      confidenceScore: a.confidenceScore,
    })),
    
    researchFindings: data.researchFindings.map(f => ({
      findingType: f.findingType,
      category: f.findingCategory as any,
      summary: f.summary,
      confidenceScore: f.confidenceScore,
      source: f.sourceId,
    })),
    
    socialProfileAudits: data.socialAudits.map(a => ({
      platform: a.platform as SocialPlatform,
      profileHandle: a.profileHandle,
      bio: a.bio,
      followerCount: a.followerCount,
      postingFrequency: a.postingFrequency,
      contentThemes: a.contentThemes,
      strengths: a.platformStrengths || [],
      weaknesses: a.platformWeaknesses || [],
      confidenceScore: a.confidenceScore,
    })),
    
    brandBlueprint: data.existingDeliverables.brandBlueprint ? {
      brandEssence: data.existingDeliverables.brandBlueprint.brandEssence || undefined,
      missionStatement: data.existingDeliverables.brandBlueprint.missionStatement || undefined,
      visionStatement: data.existingDeliverables.brandBlueprint.visionStatement || undefined,
      coreValues: data.existingDeliverables.brandBlueprint.coreValues || [],
      uniqueValueProposition: data.existingDeliverables.brandBlueprint.uniqueValueProposition || undefined,
      brandVoice: data.existingDeliverables.brandBlueprint.brandVoice || undefined,
      overallConfidenceScore: data.existingDeliverables.brandBlueprint.overallConfidenceScore || 0,
      lowConfidenceSections: data.existingDeliverables.brandBlueprint.lowConfidenceSections || [],
    } : undefined,
    
    audienceAnalysis: data.existingDeliverables.audienceAnalysis ? {
      primaryAudience: data.existingDeliverables.audienceAnalysis.primaryAudience || undefined,
      audienceSegments: data.existingDeliverables.audienceAnalysis.audienceSegments || [],
      verifiedSignals: data.existingDeliverables.audienceAnalysis.verifiedSignals || [],
      inferredAssumptions: data.existingDeliverables.audienceAnalysis.inferredAssumptions || [],
      overallConfidenceScore: data.existingDeliverables.audienceAnalysis.overallConfidenceScore || 0,
    } : undefined,
    
    contentStrategy: data.existingDeliverables.contentStrategy ? {
      contentPillars: data.existingDeliverables.contentStrategy.contentPillars || [],
      platformStrategy: data.existingDeliverables.contentStrategy.platformStrategy || [],
      growthStrategy: data.existingDeliverables.contentStrategy.growthStrategy || undefined,
      overallConfidenceScore: data.existingDeliverables.contentStrategy.overallConfidenceScore || 0,
    } : undefined,
    
    approvalHistory: [],
    campaignIdeas: [],
    relevantDocuments: [],
  }
}

// ============================================================================
// SYSTEM INSTRUCTIONS BUILDER
// ============================================================================

/**
 * The confidentiality reminder that MUST be included in all agent prompts.
 */
export const CONFIDENTIALITY_REMINDER = `
CONFIDENTIALITY RULES (CRITICAL):

You have access to two types of knowledge:

1. GLOBAL PROFESSIONAL KNOWLEDGE (Core Brain):
   - PR and marketing frameworks
   - Platform best practices
   - Industry standards
   - This knowledge is PUBLIC and may be applied to any client

2. CURRENT CLIENT KNOWLEDGE (Tenant Brain):
   - The client's intake answers
   - Research findings about THIS client
   - THIS client's brand blueprint, audience analysis, strategy
   - This knowledge is PRIVATE and CONFIDENTIAL

ABSOLUTE RULES:
- You may use global knowledge freely
- You may only use the CURRENT client's private knowledge
- You must NEVER access, reference, or imply knowledge from other clients
- You must NEVER say "another client we worked with" or similar
- You must NEVER use specific examples from other clients' work
- If you notice a useful pattern, express it as general best practice, not as client experience
- Every specific recommendation must be based on THIS client's data or public knowledge

If you are uncertain whether something is global knowledge or another client's data, DO NOT USE IT.
`.trim()

function buildSystemInstructions(
  agentName: string,
  rules: ConfidentialityRules
): string {
  const baseInstructions = `You are ${agentName}, an AI agent in the KORA intelligence system.

${CONFIDENTIALITY_REMINDER}

Your current context is scoped to tenant: ${rules.currentTenantId}

Allowed data sources:
${rules.allowedSources.map(s => `- ${s}`).join("\n")}

Blocked data sources:
${rules.blockedSources.map(s => `- ${s}`).join("\n")}

${rules.includeReminder ? "Remember: client confidentiality is paramount." : ""}
`

  return baseInstructions
}

// ============================================================================
// CONTEXT FORMATTING
// ============================================================================

function formatContextForPrompt(
  coreBrain: CoreBrainContext,
  tenantBrain: TenantBrainContext,
  deliverableType: DeliverableTypeOrAll
): { globalKnowledge: string; tenantKnowledge: string; combined: string } {
  // Format global knowledge
  let globalKnowledge = "## Global Professional Knowledge\n\n"
  
  if (coreBrain.applicableFrameworks.length > 0) {
    globalKnowledge += "### Applicable Frameworks\n"
    for (const fw of coreBrain.applicableFrameworks.slice(0, 3)) {
      globalKnowledge += `**${fw.name}**: ${fw.description}\n\n`
    }
  }
  
  if (coreBrain.platformKnowledge.size > 0) {
    globalKnowledge += "### Platform Knowledge\n"
    for (const [platform, knowledge] of coreBrain.platformKnowledge) {
      globalKnowledge += `**${knowledge.displayName}**: Best practices include: ${knowledge.contentBestPractices.slice(0, 3).join("; ")}\n\n`
    }
  }
  
  if (coreBrain.industryKnowledge) {
    globalKnowledge += `### Industry Context: ${coreBrain.industryKnowledge.industry}\n`
    globalKnowledge += `${coreBrain.industryKnowledge.description}\n\n`
  }

  // Format tenant knowledge
  let tenantKnowledge = "## Client Information (Confidential)\n\n"
  
  if (tenantBrain.intakeAnswers.length > 0) {
    tenantKnowledge += "### Client Responses\n"
    for (const answer of tenantBrain.intakeAnswers.slice(0, 10)) {
      tenantKnowledge += `**${answer.questionText}**: ${answer.answer}\n`
    }
    tenantKnowledge += "\n"
  }
  
  if (tenantBrain.socialProfileAudits.length > 0) {
    tenantKnowledge += "### Social Profile Research\n"
    for (const audit of tenantBrain.socialProfileAudits) {
      tenantKnowledge += `**${audit.platform}**: ${audit.followerCount || "N/A"} followers`
      if (audit.contentThemes.length > 0) {
        tenantKnowledge += `, themes: ${audit.contentThemes.slice(0, 3).join(", ")}`
      }
      tenantKnowledge += "\n"
    }
    tenantKnowledge += "\n"
  }
  
  if (tenantBrain.researchFindings.length > 0) {
    tenantKnowledge += "### Research Findings\n"
    for (const finding of tenantBrain.researchFindings.slice(0, 5)) {
      tenantKnowledge += `- [${finding.category}] ${finding.summary}\n`
    }
    tenantKnowledge += "\n"
  }

  // Combined with clear separation
  const combined = `${globalKnowledge}\n---\n\n${tenantKnowledge}`

  return {
    globalKnowledge,
    tenantKnowledge,
    combined,
  }
}

// ============================================================================
// CONTEXT VALIDATION
// ============================================================================

/**
 * Validates that an agent context is properly scoped.
 */
export function validateAgentContext(context: AgentContext): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check tenant_id is present
  if (!context.tenantId) {
    issues.push("Missing tenant_id")
  }

  // Check tenant brain is scoped correctly
  if (context.tenantBrain.tenantId !== context.tenantId) {
    issues.push(`Tenant brain tenant_id mismatch: ${context.tenantBrain.tenantId} vs ${context.tenantId}`)
  }

  // Check confidentiality rules match
  if (context.confidentialityRules.currentTenantId !== context.tenantId) {
    issues.push("Confidentiality rules tenant_id mismatch")
  }

  // Check system instructions include confidentiality reminder
  if (!context.systemInstructions.includes("CONFIDENTIALITY")) {
    issues.push("System instructions missing confidentiality reminder")
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
