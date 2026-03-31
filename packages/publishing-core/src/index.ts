export type PublishProvider = "meta" | "linkedin" | "youtube" | "tiktok" | "x" | "blog";

export type PublishJobStatus =
  | "scheduled"
  | "queued"
  | "running"
  | "published"
  | "failed"
  | "canceled"
  | "action_required"
  | "dead_letter";

export type PublishErrorCategory = "transient" | "auth" | "validation" | "quota" | "unknown";

export interface PublisherAdapter {
  provider: PublishProvider;
  validate(input: unknown): Promise<void>;
  publish(input: unknown): Promise<{ providerPostId?: string; raw?: unknown }>;
  normalizeError(error: unknown): { category: PublishErrorCategory; code?: string; message: string };
}
