import TelegramBot from "node-telegram-bot-api"
import { createTestingFeedback, getTenantFeedbackSummary, getLowRatedDeliverables } from "../db/testing-feedback"
import { getTenantProfileByTelegramId } from "../db/tenant-profiles"
import { getBrandBlueprint, getContentStrategy, getAudienceAnalysis } from "../db/deliverables"
import { getLatestReview } from "../db/reviews"
import { isTestTenant, getTestTenant, TEST_TENANTS } from "../types/testing"
import type { DeliverableType } from "../types/deliverables"
import type { FeedbackForm, TestingFeedback } from "../types/testing"

export async function promptTestFeedback(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  deliverableType: DeliverableType
): Promise<void> {
  if (!isTestTenant(telegramId)) return

  const testTenant = getTestTenant(telegramId)
  
  await bot.sendMessage(chatId,
    `Hey ${testTenant?.name}! As a test user, your feedback is super valuable.\n\n` +
    `Would you like to rate this ${formatDeliverableType(deliverableType)}?\n\n` +
    `Use /feedback to provide detailed ratings, or reply with a quick 1-5 rating.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Rate Now", callback_data: `feedback_${deliverableType.replace("_", "")}` },
            { text: "Skip", callback_data: "feedback_skip" },
          ],
        ],
      },
    }
  )
}

export async function autoGradeDeliverable(
  tenantId: string,
  deliverableType: DeliverableType,
  deliverableId: string,
  telegramId: number
): Promise<TestingFeedback | null> {
  if (!isTestTenant(telegramId)) return null

  const review = await getLatestReview(deliverableType, deliverableId)
  
  if (!review) {
    return null
  }

  const autoFeedback: FeedbackForm = {
    deliverableType,
    deliverableId,
    contextQuality: scoreToGrade(review.specificityScore),
    researchDepth: scoreToGrade(review.researchDepthScore),
    usefulness: scoreToGrade(review.actionabilityScore),
    brandAlignment: scoreToGrade(review.brandAlignmentScore),
    formattingQuality: scoreToGrade(review.formattingScore),
    overallGrade: scoreToGrade(review.overallScore),
    feedbackNotes: "Auto-graded based on quality review",
    specificIssues: [
      ...review.malformedFields.map(f => ({ section: f.fieldPath, issue: f.issue })),
      ...review.genericStatements.map(g => ({ section: g.fieldPath, issue: "Generic statement" })),
    ],
  }

  return createTestingFeedback(
    tenantId,
    autoFeedback,
    telegramId,
    getTestTenant(telegramId)?.name
  )
}

function scoreToGrade(score: number | null): number {
  if (score === null) return 3
  
  if (score >= 0.9) return 5
  if (score >= 0.75) return 4
  if (score >= 0.5) return 3
  if (score >= 0.25) return 2
  return 1
}

export async function sendTestingSummary(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  let summaryText = "*Testing Summary for Test Tenants*\n\n"

  for (const testTenant of TEST_TENANTS) {
    const tenant = await getTenantProfileByTelegramId(testTenant.telegramId)
    if (!tenant) continue

    summaryText += `*${testTenant.name}*\n`
    summaryText += `Stage: ${tenant.pipelineStage}\n`

    const feedbackSummary = await getTenantFeedbackSummary(tenant.id)
    if (feedbackSummary) {
      summaryText += `Feedback Count: ${feedbackSummary.totalFeedback}\n`
      summaryText += `Avg Overall: ${feedbackSummary.averageOverallGrade.toFixed(1)}/5\n`
      
      if (feedbackSummary.commonIssues.length > 0) {
        summaryText += `Issues: ${feedbackSummary.commonIssues.slice(0, 3).join(", ")}\n`
      }
    } else {
      summaryText += `No feedback yet\n`
    }

    summaryText += "\n"
  }

  const lowRated = await getLowRatedDeliverables(3)
  if (lowRated.length > 0) {
    summaryText += "*Low-Rated Deliverables (<=3)*\n"
    for (const fb of lowRated.slice(0, 5)) {
      summaryText += `- ${fb.deliverableType}: ${fb.overallGrade}/5\n`
    }
  }

  await bot.sendMessage(chatId, summaryText, { parse_mode: "Markdown" })
}

export async function sendDeliverableDebugInfo(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  deliverableType: DeliverableType
): Promise<void> {
  if (!isTestTenant(telegramId)) return

  const tenant = await getTenantProfileByTelegramId(telegramId)
  if (!tenant) return

  let deliverable: Record<string, unknown> | null = null
  let deliverableId: string | null = null

  switch (deliverableType) {
    case "brand_blueprint":
      const brand = await getBrandBlueprint(tenant.id)
      deliverable = brand as unknown as Record<string, unknown>
      deliverableId = brand?.id || null
      break
    case "content_strategy":
      const strategy = await getContentStrategy(tenant.id)
      deliverable = strategy as unknown as Record<string, unknown>
      deliverableId = strategy?.id || null
      break
    case "audience_analysis":
      const audience = await getAudienceAnalysis(tenant.id)
      deliverable = audience as unknown as Record<string, unknown>
      deliverableId = audience?.id || null
      break
  }

  if (!deliverable || !deliverableId) {
    await bot.sendMessage(chatId, `No ${formatDeliverableType(deliverableType)} found.`)
    return
  }

  const review = await getLatestReview(deliverableType, deliverableId)

  let debugText = `*Debug: ${formatDeliverableType(deliverableType)}*\n\n`
  debugText += `ID: ${deliverableId}\n`
  debugText += `Version: ${deliverable.version || "N/A"}\n`
  debugText += `Status: ${deliverable.status || "N/A"}\n`
  debugText += `Overall Confidence: ${deliverable.overallConfidenceScore || "N/A"}\n\n`

  if (review) {
    debugText += "*Quality Review:*\n"
    debugText += `Passed: ${review.passedReview ? "Yes" : "No"}\n`
    debugText += `Overall Score: ${review.overallScore?.toFixed(2) || "N/A"}\n`
    debugText += `Formatting: ${review.formattingScore?.toFixed(2) || "N/A"}\n`
    debugText += `Specificity: ${review.specificityScore?.toFixed(2) || "N/A"}\n`
    debugText += `Research Depth: ${review.researchDepthScore?.toFixed(2) || "N/A"}\n\n`

    if (review.malformedFields.length > 0) {
      debugText += `*Malformed Fields:* ${review.malformedFields.length}\n`
    }
    if (review.genericStatements.length > 0) {
      debugText += `*Generic Statements:* ${review.genericStatements.length}\n`
    }
    if (review.missingResearch.length > 0) {
      debugText += `*Research Gaps:* ${review.missingResearch.length}\n`
    }
  }

  const lowConfidence = deliverable.lowConfidenceSections as string[] | undefined
  if (lowConfidence && lowConfidence.length > 0) {
    debugText += `\n*Low Confidence Sections:*\n${lowConfidence.join(", ")}\n`
  }

  await bot.sendMessage(chatId, debugText, { parse_mode: "Markdown" })
}

function formatDeliverableType(type: DeliverableType): string {
  const names: Record<DeliverableType, string> = {
    brand_blueprint: "Brand Blueprint",
    content_strategy: "Content Strategy",
    audience_analysis: "Audience Analysis",
  }
  return names[type] || type
}

export async function logErrorForTesting(
  tenantId: string,
  telegramId: number,
  stage: string,
  error: string,
  recoverable: boolean
): Promise<void> {
  if (!isTestTenant(telegramId)) return

  console.log(`[TEST ERROR] Tenant: ${tenantId}, Stage: ${stage}`)
  console.log(`[TEST ERROR] Error: ${error}`)
  console.log(`[TEST ERROR] Recoverable: ${recoverable}`)
}

export async function checkTestTenantSetup(): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = []

  for (const testTenant of TEST_TENANTS) {
    const tenant = await getTenantProfileByTelegramId(testTenant.telegramId)
    
    if (!tenant) {
      issues.push(`Test tenant ${testTenant.name} (${testTenant.telegramId}) not found in database`)
      continue
    }

    if (!tenant.isTestTenant) {
      issues.push(`${testTenant.name} exists but is_test_tenant is false`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
