import { getDatabase } from "./client"
import type { 
  SocialProfileAudit, 
  SocialPlatform, 
  PostingFrequency, 
  DataSource,
  NotablePost 
} from "../types/research"

export interface CreateSocialAuditInput {
  tenantId: string
  platform: SocialPlatform
  profileUrl?: string
  profileHandle?: string
  bio?: string
  displayName?: string
  followerCount?: number
  followingCount?: number
  postCount?: number
  avgLikesPerPost?: number
  avgCommentsPerPost?: number
  avgEngagementRate?: number
  postingFrequency?: PostingFrequency
  lastPostDate?: Date
  contentThemes?: string[]
  contentFormats?: string[]
  hashtagUsage?: string[]
  platformStrengths?: string[]
  platformWeaknesses?: string[]
  notablePosts?: NotablePost[]
  dataSource?: DataSource
  confidenceScore?: number
  rawData?: Record<string, unknown>
  errorMessage?: string
}

export interface UpdateSocialAuditInput extends Partial<CreateSocialAuditInput> {}

function mapRowToSocialAudit(row: Record<string, unknown>): SocialProfileAudit {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    platform: row.platform as SocialPlatform,
    profileUrl: row.profile_url as string | null,
    profileHandle: row.profile_handle as string | null,
    bio: row.bio as string | null,
    displayName: row.display_name as string | null,
    followerCount: row.follower_count as number | null,
    followingCount: row.following_count as number | null,
    postCount: row.post_count as number | null,
    avgLikesPerPost: row.avg_likes_per_post as number | null,
    avgCommentsPerPost: row.avg_comments_per_post as number | null,
    avgEngagementRate: row.avg_engagement_rate ? parseFloat(row.avg_engagement_rate as string) : null,
    postingFrequency: row.posting_frequency as PostingFrequency | null,
    lastPostDate: row.last_post_date ? new Date(row.last_post_date as string) : null,
    contentThemes: (row.content_themes as string[]) || [],
    contentFormats: (row.content_formats as string[]) || [],
    hashtagUsage: (row.hashtag_usage as string[]) || [],
    platformStrengths: (row.platform_strengths as string[]) || [],
    platformWeaknesses: (row.platform_weaknesses as string[]) || [],
    notablePosts: (row.notable_posts as NotablePost[]) || [],
    auditDate: new Date(row.audit_date as string),
    dataSource: row.data_source as DataSource,
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score as string) : 0.5,
    rawData: (row.raw_data as Record<string, unknown>) || {},
    errorMessage: row.error_message as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createSocialAudit(
  input: CreateSocialAuditInput
): Promise<SocialProfileAudit | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_social_profile_audits")
    .insert({
      tenant_id: input.tenantId,
      platform: input.platform,
      profile_url: input.profileUrl || null,
      profile_handle: input.profileHandle || null,
      bio: input.bio || null,
      display_name: input.displayName || null,
      follower_count: input.followerCount || null,
      following_count: input.followingCount || null,
      post_count: input.postCount || null,
      avg_likes_per_post: input.avgLikesPerPost || null,
      avg_comments_per_post: input.avgCommentsPerPost || null,
      avg_engagement_rate: input.avgEngagementRate || null,
      posting_frequency: input.postingFrequency || null,
      last_post_date: input.lastPostDate?.toISOString() || null,
      content_themes: input.contentThemes || [],
      content_formats: input.contentFormats || [],
      hashtag_usage: input.hashtagUsage || [],
      platform_strengths: input.platformStrengths || [],
      platform_weaknesses: input.platformWeaknesses || [],
      notable_posts: input.notablePosts || [],
      data_source: input.dataSource || "inferred",
      confidence_score: input.confidenceScore || 0.5,
      raw_data: input.rawData || {},
      error_message: input.errorMessage || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating social audit:", error)
    return null
  }

  return mapRowToSocialAudit(data)
}

export async function getSocialAuditsByTenant(
  tenantId: string
): Promise<SocialProfileAudit[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_social_profile_audits")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching social audits:", error)
    return []
  }

  return (data || []).map(mapRowToSocialAudit)
}

export async function getSocialAudit(
  tenantId: string,
  platform: SocialPlatform
): Promise<SocialProfileAudit | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_social_profile_audits")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("platform", platform)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching social audit:", error)
    return null
  }

  return data ? mapRowToSocialAudit(data) : null
}

export async function upsertSocialAudit(
  input: CreateSocialAuditInput
): Promise<SocialProfileAudit | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_social_profile_audits")
    .upsert({
      tenant_id: input.tenantId,
      platform: input.platform,
      profile_url: input.profileUrl || null,
      profile_handle: input.profileHandle || null,
      bio: input.bio || null,
      display_name: input.displayName || null,
      follower_count: input.followerCount || null,
      following_count: input.followingCount || null,
      post_count: input.postCount || null,
      avg_likes_per_post: input.avgLikesPerPost || null,
      avg_comments_per_post: input.avgCommentsPerPost || null,
      avg_engagement_rate: input.avgEngagementRate || null,
      posting_frequency: input.postingFrequency || null,
      last_post_date: input.lastPostDate?.toISOString() || null,
      content_themes: input.contentThemes || [],
      content_formats: input.contentFormats || [],
      hashtag_usage: input.hashtagUsage || [],
      platform_strengths: input.platformStrengths || [],
      platform_weaknesses: input.platformWeaknesses || [],
      notable_posts: input.notablePosts || [],
      data_source: input.dataSource || "inferred",
      confidence_score: input.confidenceScore || 0.5,
      raw_data: input.rawData || {},
      error_message: input.errorMessage || null,
      audit_date: new Date().toISOString(),
    }, {
      onConflict: "tenant_id,platform",
    })
    .select()
    .single()

  if (error) {
    console.error("Error upserting social audit:", error)
    return null
  }

  return mapRowToSocialAudit(data)
}

export async function updateSocialAudit(
  id: string,
  input: UpdateSocialAuditInput
): Promise<SocialProfileAudit | null> {
  const db = getDatabase()
  if (!db) return null

  const updateData: Record<string, unknown> = {}

  if (input.profileUrl !== undefined) updateData.profile_url = input.profileUrl
  if (input.profileHandle !== undefined) updateData.profile_handle = input.profileHandle
  if (input.bio !== undefined) updateData.bio = input.bio
  if (input.displayName !== undefined) updateData.display_name = input.displayName
  if (input.followerCount !== undefined) updateData.follower_count = input.followerCount
  if (input.followingCount !== undefined) updateData.following_count = input.followingCount
  if (input.postCount !== undefined) updateData.post_count = input.postCount
  if (input.avgLikesPerPost !== undefined) updateData.avg_likes_per_post = input.avgLikesPerPost
  if (input.avgCommentsPerPost !== undefined) updateData.avg_comments_per_post = input.avgCommentsPerPost
  if (input.avgEngagementRate !== undefined) updateData.avg_engagement_rate = input.avgEngagementRate
  if (input.postingFrequency !== undefined) updateData.posting_frequency = input.postingFrequency
  if (input.lastPostDate !== undefined) updateData.last_post_date = input.lastPostDate?.toISOString()
  if (input.contentThemes !== undefined) updateData.content_themes = input.contentThemes
  if (input.contentFormats !== undefined) updateData.content_formats = input.contentFormats
  if (input.hashtagUsage !== undefined) updateData.hashtag_usage = input.hashtagUsage
  if (input.platformStrengths !== undefined) updateData.platform_strengths = input.platformStrengths
  if (input.platformWeaknesses !== undefined) updateData.platform_weaknesses = input.platformWeaknesses
  if (input.notablePosts !== undefined) updateData.notable_posts = input.notablePosts
  if (input.dataSource !== undefined) updateData.data_source = input.dataSource
  if (input.confidenceScore !== undefined) updateData.confidence_score = input.confidenceScore
  if (input.rawData !== undefined) updateData.raw_data = input.rawData
  if (input.errorMessage !== undefined) updateData.error_message = input.errorMessage

  const { data, error } = await db
    .from("intel_social_profile_audits")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating social audit:", error)
    return null
  }

  return mapRowToSocialAudit(data)
}

export async function deleteSocialAuditsByTenant(
  tenantId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const { error } = await db
    .from("intel_social_profile_audits")
    .delete()
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Error deleting social audits:", error)
    return false
  }

  return true
}
