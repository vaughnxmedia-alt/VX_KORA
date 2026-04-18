import { supabase } from "@/integrations/supabase/client";

/** Telegram bot intake finished or deliverables generating — see `telegram_intake_sessions.phase`. */
const TELEGRAM_INTAKE_COMPLETE_PHASES = ["completed", "generating"] as const;

/**
 * Customer IDs (`customers.id`) that have at least one Brand Identity (`brand_blueprints`).
 * Active Clients and related admin filters should only surface names in this set so data stays
 * aligned with what appears under Brand identities.
 */
export async function fetchCustomerIdsWithBrandIdentity(): Promise<string[]> {
  const { data, error } = await supabase.from("brand_blueprints").select("client_id");
  if (error) throw error;
  const ids = (data ?? [])
    .map((r) => r.client_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return [...new Set(ids)];
}

/** Customers that appear in Brand identities — for strategy modals, filters, etc. */
export async function fetchCustomersWithBrandIdentity(): Promise<
  { id: string; business_name: string | null; first_name: string | null; last_name: string | null }[]
> {
  const ids = await fetchCustomerIdsWithBrandIdentity();
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("id, business_name, first_name, last_name")
    .in("id", ids)
    .order("business_name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type CustomerIntakeRow = {
  id: string;
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string | null;
};

export type IntakeMeetingAsset = {
  storage_path: string;
  filename: string;
  kind: "document" | "recording";
  mime: string;
  uploaded_at: string;
};

export type IntakePipelineRow = CustomerIntakeRow & {
  meeting_id: string;
  session_type: string | null;
  meeting_date: string | null;
  intake_meeting_assets: IntakeMeetingAsset[];
};

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

/** CRM records with no Brand identity yet — send them through the current Strategy Session intake. */
export async function fetchCustomersPendingBrandIdentity(): Promise<CustomerIntakeRow[]> {
  const identityIds = new Set(await fetchCustomerIdsWithBrandIdentity());
  const { data, error } = await supabase
    .from("customers")
    .select("id, business_name, first_name, last_name, email, phone_number, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((c) => !identityIds.has(c.id)) as CustomerIntakeRow[];
}

/**
 * Customers linked to Telegram where intake reached `completed` or `generating` (Users / “Telegram” tab).
 */
export async function fetchCustomersTelegramIntakeComplete(): Promise<
  Record<string, unknown>[]
> {
  const { data: sessions, error: sErr } = await supabase
    .from("telegram_intake_sessions")
    .select("telegram_id, telegram_username, phase")
    .in("phase", [...TELEGRAM_INTAKE_COMPLETE_PHASES]);
  if (sErr) throw sErr;
  if (!sessions?.length) return [];

  const usernameByTelegramId = new Map<number, string | null>();
  for (const s of sessions) {
    usernameByTelegramId.set(Number(s.telegram_id), s.telegram_username ?? null);
  }

  const tgIds = [...new Set(sessions.map((s) => Number(s.telegram_id)))];
  const { data: rows, error } = await supabase
    .from("customers")
    .select("*")
    .in("telegram_id", tgIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (rows ?? []).map((row) => ({
    ...row,
    telegram_username: usernameByTelegramId.get(Number(row.telegram_id)) ?? null,
  }));
}

const INTAKE_BUCKET = "strategy-session-intake";

/**
 * Strategy Session: after the lead is confirmed in Leads (`booking_status = confirmed`), they appear here until a
 * Brand Identity exists. Includes meeting id for uploading session notes / MP3 recordings.
 */
export async function fetchIntakePipelineRows(): Promise<IntakePipelineRow[]> {
  const identityIds = new Set(await fetchCustomerIdsWithBrandIdentity());

  const { data: meetingRows, error: mErr } = await supabase
    .from("meetings")
    .select("id, customer_id, session_type, meeting_date, intake_meeting_assets")
    .eq("service_name", "Strategy Session")
    .eq("payment_status", "paid")
    .eq("booking_status", "confirmed")
    .not("customer_id", "is", null)
    .order("meeting_date", { ascending: false });
  if (mErr) throw mErr;

  const seenCustomer = new Set<string>();
  const primaryMeetings: {
    id: string;
    customer_id: string;
    session_type: string | null;
    meeting_date: string | null;
    intake_meeting_assets: unknown;
  }[] = [];
  for (const m of meetingRows ?? []) {
    const cid = m.customer_id as string | null;
    if (!cid || seenCustomer.has(cid)) continue;
    seenCustomer.add(cid);
    primaryMeetings.push({
      id: m.id as string,
      customer_id: cid,
      session_type: (m.session_type as string | null) ?? null,
      meeting_date: (m.meeting_date as string | null) ?? null,
      intake_meeting_assets: m.intake_meeting_assets,
    });
  }

  if (primaryMeetings.length === 0) return [];

  const customerIds = primaryMeetings.map((x) => x.customer_id);
  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("id, business_name, first_name, last_name, email, phone_number, created_at, telegram_id")
    .in("id", customerIds);
  if (cErr) throw cErr;

  const byId = new Map((customers ?? []).map((c) => [c.id, c]));
  const out: IntakePipelineRow[] = [];
  for (const m of primaryMeetings) {
    const c = byId.get(m.customer_id);
    if (!c || identityIds.has(c.id)) continue;
    out.push({
      ...c,
      meeting_id: m.id,
      session_type: m.session_type,
      meeting_date: m.meeting_date,
      intake_meeting_assets: parseIntakeMeetingAssets(m.intake_meeting_assets),
    });
  }

  out.sort((a, b) => {
    const ta = a.meeting_date ? new Date(a.meeting_date).getTime() : 0;
    const tb = b.meeting_date ? new Date(b.meeting_date).getTime() : 0;
    return tb - ta;
  });

  return out;
}

/** Narrow row shape for legacy callers; prefer {@link fetchIntakePipelineRows}. */
export async function fetchCustomersPendingIntake(): Promise<CustomerIntakeRow[]> {
  const rows = await fetchIntakePipelineRows();
  return rows.map((r) => ({
    id: r.id,
    business_name: r.business_name,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone_number: r.phone_number,
    created_at: r.created_at,
  }));
}

export async function uploadStrategySessionIntakeAsset(
  meetingId: string,
  file: File,
  kind: "document" | "recording",
): Promise<IntakeMeetingAsset> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  const storagePath = `${meetingId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from(INTAKE_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const asset: IntakeMeetingAsset = {
    storage_path: storagePath,
    filename: file.name,
    kind,
    mime: file.type || "application/octet-stream",
    uploaded_at: new Date().toISOString(),
  };

  const { data: row, error: fErr } = await supabase
    .from("meetings")
    .select("intake_meeting_assets")
    .eq("id", meetingId)
    .single();
  if (fErr) throw fErr;
  const prev = parseIntakeMeetingAssets(row?.intake_meeting_assets);
  const { error: uErr } = await supabase
    .from("meetings")
    .update({ intake_meeting_assets: [...prev, asset] })
    .eq("id", meetingId);
  if (uErr) throw uErr;
  return asset;
}

export async function createSignedIntakeAssetUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(INTAKE_BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export { INTAKE_BUCKET };
