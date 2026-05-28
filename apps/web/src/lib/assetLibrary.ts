import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  createSignedIntakeAssetUrl,
  type IntakeMeetingAsset,
} from "@/lib/brandIdentityScope";
import { isStarterGuideBriefPath, type AuditIntakeSource } from "@/lib/freeAuditIntakeDisplay";
import {
  filenameFromUrl,
  isLikelyVideoUrl,
  linkCalendarVideoToAudit,
  registerAuditMediaReference,
  s3StoragePathFromPublicUrl,
  uploadContentCalendarVideo,
} from "@/lib/clientMedia";

const BOOKED_FOLLOW_UP = new Set(["booked_strategy_session", "converted"]);
const AUDIO_BUCKET = "free-audit-audio";
const IMAGE_BUCKET = "audit-asset-images";
const DOC_BUCKET = "audit-asset-docs";
const EVIDENCE_BUCKET = "free-audit-evidence";

export type AssetMediaKind = "video" | "image" | "doc";

export type AssetMediaItem = {
  id: string;
  kind: AssetMediaKind;
  provider: "s3" | "supabase";
  title: string;
  viewUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  mimeType: string | null;
  createdAt: string | null;
  source: "upload" | "evidence" | "storage" | "content_calendar";
};

export type AuditMediaBundle = {
  videos: AssetMediaItem[];
  images: AssetMediaItem[];
  docs: AssetMediaItem[];
};

export type AuditAssetLinks = {
  pdfUrl: string | null;
  pdfStatus: string | null;
  audioUrl: string | null;
  audioListenUrl: string | null;
  audioStatus: string | null;
};

export type PreScreeningUser = {
  auditId: string;
  auditIntakeId: string | null;
  customerId: string | null;
  businessName: string;
  contactName: string | null;
  email: string | null;
  submittedAt: string;
  deliveryPath: "Audit" | "Guide";
  followUpStatus: string;
  assets: AuditAssetLinks;
  auditsHref: string;
};

export type ScreenedReportLinks = {
  intakeMeetingId: string | null;
  intakeAssets: IntakeMeetingAsset[];
  identityBlueprintId: string | null;
  identityHref: string | null;
  audienceProfileIds: string[];
  audienceHref: string | null;
};

export type ScreenedUser = {
  customerId: string;
  auditId: string | null;
  businessName: string;
  contactName: string | null;
  email: string | null;
  sessionDate: string | null;
  reports: ScreenedReportLinks;
  intakeHref: string;
};

function asRecord(value: Json | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function auditPublicSlug(businessName: string | null | undefined): string {
  const raw = (businessName ?? "").trim() || "brand-audit";
  return (
    raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 90) || "brand-audit"
  );
}

function displayBusinessName(row: {
  business_name: string | null;
  contact_name?: string | null;
  lead_email_lower?: string | null;
}): string {
  if (row.business_name?.trim()) return row.business_name.trim();
  if (row.contact_name?.trim()) return row.contact_name.trim();
  if (row.lead_email_lower?.trim()) return row.lead_email_lower.trim();
  return "Unnamed lead";
}

function displayContactName(first: string | null, last: string | null): string | null {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n || null;
}

function parseIntakeMeetingAssets(raw: unknown): IntakeMeetingAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is IntakeMeetingAsset =>
      Boolean(a) &&
      typeof a === "object" &&
      typeof (a as IntakeMeetingAsset).storage_path === "string" &&
      typeof (a as IntakeMeetingAsset).filename === "string",
  );
}

function audioFromMetadata(metadata: Json | undefined): { url: string | null; bucket: string | null; path: string | null } {
  const audio = asRecord(asRecord(metadata).report_audio as Json | undefined);
  const url = typeof audio.url === "string" && audio.url.trim() ? audio.url.trim() : null;
  const bucket = typeof audio.storage_bucket === "string" ? audio.storage_bucket : AUDIO_BUCKET;
  const path = typeof audio.storage_path === "string" ? audio.storage_path : null;
  return { url, bucket, path };
}

async function resolveAudioUrl(
  deliverable: { audio_public_url: string | null; audio_storage_bucket: string | null; audio_storage_path: string | null } | null,
  metadata: Json | undefined,
  businessName: string | null,
): Promise<{ playUrl: string | null; listenUrl: string | null }> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const listenUrl = `${origin}/audit/${auditPublicSlug(businessName)}`;

  if (deliverable?.audio_public_url?.trim()) {
    return { playUrl: deliverable.audio_public_url.trim(), listenUrl };
  }

  const meta = audioFromMetadata(metadata);
  if (meta.url) return { playUrl: meta.url, listenUrl };

  const bucket = deliverable?.audio_storage_bucket ?? meta.bucket;
  const path = deliverable?.audio_storage_path ?? meta.path;
  if (bucket && path) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) return { playUrl: data.signedUrl, listenUrl };
  }

  return { playUrl: null, listenUrl };
}

function pdfFromDeliverable(
  row: { pdf_public_url: string | null; delivery_status: string | null } | null,
): { pdfUrl: string | null; pdfStatus: string | null } {
  return {
    pdfUrl: row?.pdf_public_url?.trim() || null,
    pdfStatus: row?.delivery_status ?? null,
  };
}

export async function fetchPreScreeningUsers(): Promise<PreScreeningUser[]> {
  const { data: audits, error } = await supabase
    .from("free_audits")
    .select(
      "id,audit_intake_id,customer_id,business_name,contact_name,lead_email_lower,follow_up_status,metadata,created_at,website_link,instagram,facebook,tiktok,other_socials",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  const rows = (audits ?? []).filter((a) => !BOOKED_FOLLOW_UP.has(String(a.follow_up_status ?? "")));
  const intakeIds = [
    ...new Set(
      rows
        .map((r) => r.audit_intake_id as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const pdfByIntake = new Map<string, { pdf_public_url: string | null; delivery_status: string | null }>();
  const audioByIntake = new Map<
    string,
    {
      audio_public_url: string | null;
      audio_storage_bucket: string | null;
      audio_storage_path: string | null;
      delivery_status: string | null;
    }
  >();

  if (intakeIds.length > 0) {
    const [pdfRes, audioRes] = await Promise.all([
      supabase
        .from("audit_pdf_deliverables")
        .select("audit_intake_id,pdf_public_url,delivery_status")
        .in("audit_intake_id", intakeIds),
      supabase
        .from("audit_audio_deliverables")
        .select("audit_intake_id,audio_public_url,audio_storage_bucket,audio_storage_path,delivery_status")
        .in("audit_intake_id", intakeIds),
    ]);
    if (pdfRes.error) throw pdfRes.error;
    if (audioRes.error) throw audioRes.error;
    for (const p of pdfRes.data ?? []) {
      pdfByIntake.set(p.audit_intake_id, p);
    }
    for (const a of audioRes.data ?? []) {
      audioByIntake.set(a.audit_intake_id, a);
    }
  }

  const users = await Promise.all(
    rows.map(async (audit) => {
      const intakeId = audit.audit_intake_id as string | null;
      const pdfRow = intakeId ? pdfByIntake.get(intakeId) ?? null : null;
      const audioRow = intakeId ? audioByIntake.get(intakeId) ?? null : null;
      const { pdfUrl, pdfStatus } = pdfFromDeliverable(pdfRow);
      const { playUrl, listenUrl } = await resolveAudioUrl(audioRow, audit.metadata as Json, audit.business_name);
      const auditSource = audit as AuditIntakeSource;

      return {
        auditId: audit.id,
        auditIntakeId: intakeId,
        customerId: (audit.customer_id as string | null) ?? null,
        businessName: displayBusinessName(audit),
        contactName: audit.contact_name,
        email: audit.lead_email_lower,
        submittedAt: audit.created_at,
        deliveryPath: isStarterGuideBriefPath(auditSource) ? "Guide" : "Audit",
        followUpStatus: audit.follow_up_status,
        assets: {
          pdfUrl,
          pdfStatus,
          audioUrl: playUrl,
          audioListenUrl: listenUrl,
          audioStatus: audioRow?.delivery_status ?? null,
        },
        auditsHref: `/dashboard/audits`,
      } satisfies PreScreeningUser;
    }),
  );

  return users;
}

export async function fetchScreenedUsers(): Promise<ScreenedUser[]> {
  const { data: meetings, error: mErr } = await supabase
    .from("meetings")
    .select("id, customer_id, meeting_date, intake_meeting_assets")
    .eq("service_name", "Strategy Session")
    .eq("payment_status", "paid")
    .eq("booking_status", "confirmed")
    .not("customer_id", "is", null)
    .order("meeting_date", { ascending: false });
  if (mErr) throw mErr;

  const meetingByCustomer = new Map<
    string,
    { id: string; meeting_date: string | null; intake_meeting_assets: unknown }
  >();
  for (const m of meetings ?? []) {
    const cid = m.customer_id as string;
    if (!cid || meetingByCustomer.has(cid)) continue;
    meetingByCustomer.set(cid, {
      id: m.id as string,
      meeting_date: (m.meeting_date as string | null) ?? null,
      intake_meeting_assets: m.intake_meeting_assets,
    });
  }

  const customerIds = [...meetingByCustomer.keys()];
  if (customerIds.length === 0) return [];

  const [customersRes, blueprintsRes, audienceRes, auditsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, business_name, first_name, last_name, email")
      .in("id", customerIds),
    supabase.from("brand_blueprints").select("id, client_id, business_name").in("client_id", customerIds),
    (supabase as { from: (t: string) => ReturnType<typeof supabase.from> })
      .from("audience_analyses")
      .select("id, client_id, audience_name, generated_at")
      .in("client_id", customerIds)
      .order("generated_at", { ascending: false }),
    supabase
      .from("free_audits")
      .select("id, customer_id")
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false }),
  ]);

  if (customersRes.error) throw customersRes.error;
  if (blueprintsRes.error) throw blueprintsRes.error;
  if (audienceRes.error) throw audienceRes.error;
  if (auditsRes.error) throw auditsRes.error;

  const auditIdByCustomer = new Map<string, string>();
  for (const row of auditsRes.data ?? []) {
    const cid = row.customer_id as string | null;
    if (cid && !auditIdByCustomer.has(cid)) auditIdByCustomer.set(cid, row.id as string);
  }

  const blueprintByClient = new Map<string, { id: string; business_name: string }>();
  for (const bp of blueprintsRes.data ?? []) {
    if (!blueprintByClient.has(bp.client_id)) {
      blueprintByClient.set(bp.client_id, { id: bp.id, business_name: bp.business_name });
    }
  }

  const audienceIdsByClient = new Map<string, string[]>();
  for (const row of audienceRes.data ?? []) {
    const cid = row.client_id as string;
    if (!cid) continue;
    const list = audienceIdsByClient.get(cid) ?? [];
    list.push(row.id as string);
    audienceIdsByClient.set(cid, list);
  }

  const users: ScreenedUser[] = [];
  for (const customer of customersRes.data ?? []) {
    const meeting = meetingByCustomer.get(customer.id);
    if (!meeting) continue;

    const blueprint = blueprintByClient.get(customer.id);
    const audienceIds = audienceIdsByClient.get(customer.id) ?? [];

    users.push({
      customerId: customer.id,
      auditId: auditIdByCustomer.get(customer.id) ?? null,
      businessName: customer.business_name?.trim() || displayBusinessName(customer),
      contactName: displayContactName(customer.first_name, customer.last_name),
      email: customer.email,
      sessionDate: meeting.meeting_date,
      reports: {
        intakeMeetingId: meeting.id,
        intakeAssets: parseIntakeMeetingAssets(meeting.intake_meeting_assets),
        identityBlueprintId: blueprint?.id ?? null,
        identityHref: blueprint ? `/dashboard/identities` : null,
        audienceProfileIds: audienceIds,
        audienceHref: audienceIds.length > 0 ? `/dashboard/audience` : null,
      },
      intakeHref: "/dashboard/intake",
    });
  }

  users.sort((a, b) => {
    const ta = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
    const tb = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
    return tb - ta;
  });

  return users;
}

export async function openIntakeAsset(storagePath: string): Promise<string | null> {
  return createSignedIntakeAssetUrl(storagePath);
}

function safeStorageName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

async function signedSupabaseUrl(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function listBucketFiles(bucket: string, prefix: string): Promise<{ name: string; id: string; metadata?: { mimetype?: string } }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data) return [];
  return data.filter((f) => f.name && !f.name.endsWith("/"));
}

async function resolveMediaItems(
  items: Array<{
    id: string;
    kind: AssetMediaKind;
    provider: "s3" | "supabase";
    title: string;
    storageBucket: string | null;
    storagePath: string | null;
    publicUrl: string | null;
    mimeType: string | null;
    createdAt: string | null;
    source: AssetMediaItem["source"];
  }>,
): Promise<AssetMediaItem[]> {
  return Promise.all(
    items.map(async (item) => {
      let viewUrl = item.publicUrl?.trim() || null;
      if (!viewUrl && item.storageBucket && item.storagePath) {
        viewUrl = await signedSupabaseUrl(item.storageBucket, item.storagePath);
      }
      return {
        id: item.id,
        kind: item.kind,
        provider: item.provider,
        title: item.title,
        viewUrl,
        storageBucket: item.storageBucket,
        storagePath: item.storagePath,
        mimeType: item.mimeType,
        createdAt: item.createdAt,
        source: item.source,
      };
    }),
  );
}

/** All video / image / doc assets tied to one audit (uploads, research screenshots, bucket files). */
export async function fetchAuditMediaBundle(auditId: string): Promise<AuditMediaBundle> {
  const pending: Array<{
    id: string;
    kind: AssetMediaKind;
    provider: "s3" | "supabase";
    title: string;
    storageBucket: string | null;
    storagePath: string | null;
    publicUrl: string | null;
    mimeType: string | null;
    createdAt: string | null;
    source: AssetMediaItem["source"];
  }> = [];

  const { data: libraryRows, error: libErr } = await supabase
    .from("audit_client_assets")
    .select(
      "id,asset_kind,storage_provider,storage_bucket,storage_path,public_url,filename,mime_type,created_at",
    )
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false });
  if (libErr) throw libErr;

  for (const row of libraryRows ?? []) {
    const kind = row.asset_kind as AssetMediaKind;
    pending.push({
      id: row.id,
      kind,
      provider: row.storage_provider as "s3" | "supabase",
      title: row.filename,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      publicUrl: row.public_url,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      source: "upload",
    });
  }

  const { data: evidenceRows, error: evErr } = await supabase
    .from("audit_social_evidence")
    .select("id,source_label,source_type,metadata,captured_at")
    .eq("audit_id", auditId)
    .order("captured_at", { ascending: false });
  if (evErr) throw evErr;

  for (const row of evidenceRows ?? []) {
    const meta = asRecord(row.metadata as Json | undefined);
    const path = typeof meta.storage_path === "string" ? meta.storage_path : null;
    const bucket = typeof meta.storage_bucket === "string" ? meta.storage_bucket : EVIDENCE_BUCKET;
    if (!path) continue;
    pending.push({
      id: `evidence-${row.id}`,
      kind: "image",
      provider: "supabase",
      title: row.source_label?.trim() || `${row.source_type} screenshot`,
      storageBucket: bucket,
      storagePath: path,
      publicUrl: null,
      mimeType: "image/png",
      createdAt: row.captured_at ?? null,
      source: "evidence",
    });
  }

  const [imageFiles, docFiles, evidenceFiles] = await Promise.all([
    listBucketFiles(IMAGE_BUCKET, auditId),
    listBucketFiles(DOC_BUCKET, auditId),
    listBucketFiles(EVIDENCE_BUCKET, `screenshots/${auditId}`),
  ]);

  const seenPaths = new Set(
    pending.map((p) => p.storagePath).filter((p): p is string => Boolean(p)),
  );

  for (const f of imageFiles) {
    const path = `${auditId}/${f.name}`;
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);
    pending.push({
      id: `storage-image-${path}`,
      kind: "image",
      provider: "supabase",
      title: f.name,
      storageBucket: IMAGE_BUCKET,
      storagePath: path,
      publicUrl: null,
      mimeType: f.metadata?.mimetype ?? null,
      createdAt: null,
      source: "storage",
    });
  }

  for (const f of [...evidenceFiles]) {
    const path = `screenshots/${auditId}/${f.name}`;
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);
    pending.push({
      id: `storage-evidence-${path}`,
      kind: "image",
      provider: "supabase",
      title: f.name,
      storageBucket: EVIDENCE_BUCKET,
      storagePath: path,
      publicUrl: null,
      mimeType: f.metadata?.mimetype ?? "image/png",
      createdAt: null,
      source: "storage",
    });
  }

  for (const f of docFiles) {
    const path = `${auditId}/${f.name}`;
    pending.push({
      id: `storage-doc-${path}`,
      kind: "doc",
      provider: "supabase",
      title: f.name,
      storageBucket: DOC_BUCKET,
      storagePath: path,
      publicUrl: null,
      mimeType: f.metadata?.mimetype ?? null,
      createdAt: null,
      source: "storage",
    });
  }

  const { data: auditRow } = await supabase
    .from("free_audits")
    .select("customer_id")
    .eq("id", auditId)
    .maybeSingle();

  const customerId = auditRow?.customer_id as string | null | undefined;
  if (customerId) {
    const { data: calendars } = await supabase
      .from("content_calendars")
      .select("id")
      .eq("customer_id", customerId);
    const calendarIds = (calendars ?? []).map((c) => c.id as string);
    if (calendarIds.length > 0) {
      const { data: posts } = await supabase
        .from("scheduled_posts")
        .select("id, media_urls, created_at")
        .in("calendar_id", calendarIds)
        .order("created_at", { ascending: false })
        .limit(100);
      for (const post of posts ?? []) {
        const urls = Array.isArray(post.media_urls) ? post.media_urls : [];
        for (const url of urls) {
          if (typeof url !== "string" || !url.trim()) continue;
          const storagePath = url.includes("amazonaws.com")
            ? s3StoragePathFromPublicUrl(url)
            : url;
          if (seenPaths.has(storagePath)) continue;
          seenPaths.add(storagePath);
          const isVideo = isLikelyVideoUrl(url);
          pending.push({
            id: `calendar-${post.id}-${storagePath}`,
            kind: isVideo ? "video" : "image",
            provider: url.includes("amazonaws.com") ? "s3" : "supabase",
            title: filenameFromUrl(url, isVideo ? "Video" : "Image"),
            storageBucket: isVideo ? null : "blog-images",
            storagePath,
            publicUrl: url,
            mimeType: isVideo ? "video/mp4" : null,
            createdAt: (post.created_at as string | null) ?? null,
            source: "content_calendar",
          });
        }
      }
    }
  }

  const resolved = await resolveMediaItems(pending);
  const dedupe = new Map<string, AssetMediaItem>();
  for (const item of resolved) {
    const key = item.storagePath ?? item.viewUrl ?? item.id;
    if (!dedupe.has(key)) dedupe.set(key, item);
  }
  const all = [...dedupe.values()];
  return {
    videos: all.filter((i) => i.kind === "video"),
    images: all.filter((i) => i.kind === "image"),
    docs: all.filter((i) => i.kind === "doc"),
  };
}

export async function uploadAuditVideo(
  auditId: string,
  file: File,
  customerId?: string | null,
): Promise<AssetMediaItem> {
  const { publicUrl, storagePath } = await uploadContentCalendarVideo(file);
  await registerAuditMediaReference({
    auditId,
    customerId,
    assetKind: "video",
    storageProvider: "s3",
    storageBucket: null,
    storagePath,
    publicUrl,
    filename: file.name,
    mimeType: file.type || "video/mp4",
    fileSizeBytes: file.size,
    linkedFrom: "asset_library",
  });
  return {
    id: `upload-${Date.now()}`,
    kind: "video",
    provider: "s3",
    title: file.name,
    viewUrl: publicUrl,
    storageBucket: null,
    storagePath,
    mimeType: file.type || "video/mp4",
    createdAt: new Date().toISOString(),
    source: "upload",
  };
}

async function uploadToSupabaseAssetBucket(
  auditId: string,
  file: File,
  bucket: string,
  assetKind: "image" | "doc",
  customerId?: string | null,
): Promise<AssetMediaItem> {
  const path = `${auditId}/${Date.now()}-${safeStorageName(file.name)}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;
  const viewUrl = await signedSupabaseUrl(bucket, path);
  await registerAuditMediaReference({
    auditId,
    customerId,
    assetKind,
    storageProvider: "supabase",
    storageBucket: bucket,
    storagePath: path,
    publicUrl: viewUrl,
    filename: file.name,
    mimeType: file.type || null,
    fileSizeBytes: file.size,
    linkedFrom: "asset_library",
  });
  return {
    id: `upload-${Date.now()}`,
    kind: assetKind,
    provider: "supabase",
    title: file.name,
    viewUrl,
    storageBucket: bucket,
    storagePath: path,
    mimeType: file.type || null,
    createdAt: new Date().toISOString(),
    source: "upload",
  };
}

export function uploadAuditImage(
  auditId: string,
  file: File,
  customerId?: string | null,
): Promise<AssetMediaItem> {
  return uploadToSupabaseAssetBucket(auditId, file, IMAGE_BUCKET, "image", customerId);
}

export function uploadAuditDoc(
  auditId: string,
  file: File,
  customerId?: string | null,
): Promise<AssetMediaItem> {
  return uploadToSupabaseAssetBucket(auditId, file, DOC_BUCKET, "doc", customerId);
}

export async function openAuditMediaItem(item: AssetMediaItem): Promise<boolean> {
  let url = item.viewUrl;
  if (!url && item.storageBucket && item.storagePath) {
    url = await signedSupabaseUrl(item.storageBucket, item.storagePath);
  }
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export { linkCalendarImageToAudit, linkCalendarVideoToAudit, resolveAuditIdForCustomer } from "@/lib/clientMedia";
