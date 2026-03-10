import { getDatabase } from "./client"
import type { 
  TenantProfile, 
  IntakeStatus, 
  ResearchStatus, 
  GenerationStatus, 
  ReviewStatus, 
  DeliveryStatus,
  PipelineStage,
  SocialPlatform
} from "../types/research"

export interface CreateTenantProfileInput {
  customerId: string
  telegramId: number
  telegramUsername?: string
  businessName?: string
  websiteUrl?: string
  socialHandles?: Record<SocialPlatform, string>
  industry?: string
  businessType?: string
  isTestTenant?: boolean
  testNotes?: string
}

export interface UpdateTenantProfileInput {
  businessName?: string
  websiteUrl?: string
  socialHandles?: Record<SocialPlatform, string>
  industry?: string
  businessType?: string
  intakeStatus?: IntakeStatus
  researchStatus?: ResearchStatus
  generationStatus?: GenerationStatus
  reviewStatus?: ReviewStatus
  deliveryStatus?: DeliveryStatus
  pipelineStage?: PipelineStage
  pipelineError?: string | null
  pipelineStartedAt?: Date | null
  pipelineCompletedAt?: Date | null
}

function mapRowToTenantProfile(row: Record<string, unknown>): TenantProfile {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    telegramId: row.telegram_id as number,
    telegramUsername: row.telegram_username as string | null,
    businessName: row.business_name as string | null,
    websiteUrl: row.website_url as string | null,
    socialHandles: (row.social_handles as Record<SocialPlatform, string>) || {},
    industry: row.industry as string | null,
    businessType: row.business_type as string | null,
    intakeStatus: row.intake_status as IntakeStatus,
    researchStatus: row.research_status as ResearchStatus,
    generationStatus: row.generation_status as GenerationStatus,
    reviewStatus: row.review_status as ReviewStatus,
    deliveryStatus: row.delivery_status as DeliveryStatus,
    pipelineStage: row.pipeline_stage as PipelineStage,
    pipelineError: row.pipeline_error as string | null,
    pipelineStartedAt: row.pipeline_started_at ? new Date(row.pipeline_started_at as string) : null,
    pipelineCompletedAt: row.pipeline_completed_at ? new Date(row.pipeline_completed_at as string) : null,
    isTestTenant: row.is_test_tenant as boolean,
    testNotes: row.test_notes as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createTenantProfile(
  input: CreateTenantProfileInput
): Promise<TenantProfile | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .insert({
      customer_id: input.customerId,
      telegram_id: input.telegramId,
      telegram_username: input.telegramUsername || null,
      business_name: input.businessName || null,
      website_url: input.websiteUrl || null,
      social_handles: input.socialHandles || {},
      industry: input.industry || null,
      business_type: input.businessType || null,
      is_test_tenant: input.isTestTenant || false,
      test_notes: input.testNotes || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating tenant profile:", error)
    return null
  }

  return mapRowToTenantProfile(data)
}

export async function getTenantProfile(id: string): Promise<TenantProfile | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching tenant profile:", error)
    return null
  }

  return data ? mapRowToTenantProfile(data) : null
}

export async function getTenantProfileByTelegramId(
  telegramId: number
): Promise<TenantProfile | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching tenant profile by telegram ID:", error)
    return null
  }

  return data ? mapRowToTenantProfile(data) : null
}

export async function getTenantProfileByCustomerId(
  customerId: string
): Promise<TenantProfile | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .select("*")
    .eq("customer_id", customerId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching tenant profile by customer ID:", error)
    return null
  }

  return data ? mapRowToTenantProfile(data) : null
}

export async function updateTenantProfile(
  id: string,
  input: UpdateTenantProfileInput
): Promise<TenantProfile | null> {
  const db = getDatabase()
  if (!db) return null

  const updateData: Record<string, unknown> = {}

  if (input.businessName !== undefined) updateData.business_name = input.businessName
  if (input.websiteUrl !== undefined) updateData.website_url = input.websiteUrl
  if (input.socialHandles !== undefined) updateData.social_handles = input.socialHandles
  if (input.industry !== undefined) updateData.industry = input.industry
  if (input.businessType !== undefined) updateData.business_type = input.businessType
  if (input.intakeStatus !== undefined) updateData.intake_status = input.intakeStatus
  if (input.researchStatus !== undefined) updateData.research_status = input.researchStatus
  if (input.generationStatus !== undefined) updateData.generation_status = input.generationStatus
  if (input.reviewStatus !== undefined) updateData.review_status = input.reviewStatus
  if (input.deliveryStatus !== undefined) updateData.delivery_status = input.deliveryStatus
  if (input.pipelineStage !== undefined) updateData.pipeline_stage = input.pipelineStage
  if (input.pipelineError !== undefined) updateData.pipeline_error = input.pipelineError
  if (input.pipelineStartedAt !== undefined) {
    updateData.pipeline_started_at = input.pipelineStartedAt?.toISOString() || null
  }
  if (input.pipelineCompletedAt !== undefined) {
    updateData.pipeline_completed_at = input.pipelineCompletedAt?.toISOString() || null
  }

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating tenant profile:", error)
    return null
  }

  return mapRowToTenantProfile(data)
}

export async function getOrCreateTenantProfile(
  telegramId: number,
  telegramUsername: string | null,
  customerId?: string
): Promise<TenantProfile | null> {
  let profile = await getTenantProfileByTelegramId(telegramId)
  
  if (!profile) {
    const cId = customerId || `tenant_${telegramId}`
    profile = await createTenantProfile({
      customerId: cId,
      telegramId,
      telegramUsername: telegramUsername || undefined,
    })
  }

  return profile
}

export async function updatePipelineStage(
  id: string,
  stage: PipelineStage,
  error?: string
): Promise<TenantProfile | null> {
  const updates: UpdateTenantProfileInput = {
    pipelineStage: stage,
    pipelineError: error || null,
  }

  if (stage === "intake") {
    updates.pipelineStartedAt = new Date()
  }

  if (stage === "complete") {
    updates.pipelineCompletedAt = new Date()
    updates.intakeStatus = "complete"
    updates.deliveryStatus = "complete"
  }

  if (stage === "error") {
    updates.pipelineError = error || "Unknown error"
  }

  return updateTenantProfile(id, updates)
}

export async function getTestTenants(): Promise<TenantProfile[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .select("*")
    .eq("is_test_tenant", true)

  if (error) {
    console.error("Error fetching test tenants:", error)
    return []
  }

  return (data || []).map(mapRowToTenantProfile)
}

export async function getActivePipelineRuns(): Promise<TenantProfile[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_tenant_profiles")
    .select("*")
    .not("pipeline_stage", "in", "(complete,error)")
    .not("pipeline_started_at", "is", null)

  if (error) {
    console.error("Error fetching active pipeline runs:", error)
    return []
  }

  return (data || []).map(mapRowToTenantProfile)
}
