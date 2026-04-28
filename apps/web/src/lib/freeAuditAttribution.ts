export type FreeAuditAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
  landing_path: string | null;
  current_url: string | null;
  first_touch_at: string;
  last_touch_at: string;
  correlation_id: string;
  lead_source: string;
  messaging_angle: string;
  hook: string;
};

const STORAGE_KEY = "kora_free_audit_attribution";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredAttribution(): Partial<FreeAuditAttribution> {
  const storage = safeStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Partial<FreeAuditAttribution> : {};
  } catch {
    return {};
  }
}

function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kora-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function param(search: URLSearchParams, key: string): string | null {
  const value = search.get(key)?.trim();
  return value || null;
}

export function collectFreeAuditAttribution(overrides: Partial<FreeAuditAttribution> = {}): FreeAuditAttribution {
  const now = new Date().toISOString();
  const stored = readStoredAttribution();
  const url = typeof window === "undefined" ? null : new URL(window.location.href);
  const search = url?.searchParams ?? new URLSearchParams();
  const landingPage = stored.landing_page ?? url?.href ?? null;
  const attribution: FreeAuditAttribution = {
    utm_source: param(search, "utm_source") ?? stored.utm_source ?? null,
    utm_medium: param(search, "utm_medium") ?? stored.utm_medium ?? null,
    utm_campaign: param(search, "utm_campaign") ?? stored.utm_campaign ?? null,
    utm_content: param(search, "utm_content") ?? stored.utm_content ?? null,
    utm_term: param(search, "utm_term") ?? stored.utm_term ?? null,
    referrer: stored.referrer ?? (typeof document === "undefined" ? null : document.referrer || null),
    landing_page: landingPage,
    landing_path: stored.landing_path ?? url?.pathname ?? null,
    current_url: url?.href ?? stored.current_url ?? null,
    first_touch_at: stored.first_touch_at ?? now,
    last_touch_at: now,
    correlation_id: stored.correlation_id ?? createCorrelationId(),
    lead_source: param(search, "utm_source") ?? stored.lead_source ?? "direct",
    messaging_angle: param(search, "messaging_angle") ?? stored.messaging_angle ?? param(search, "utm_campaign") ?? "free_audit",
    hook: param(search, "hook") ?? stored.hook ?? param(search, "utm_content") ?? "start_free_audit",
    ...overrides,
  };

  safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}

export function readFreeAuditAttribution(): FreeAuditAttribution {
  return collectFreeAuditAttribution();
}

export function clearFreeAuditAttribution(): void {
  safeStorage()?.removeItem(STORAGE_KEY);
}
