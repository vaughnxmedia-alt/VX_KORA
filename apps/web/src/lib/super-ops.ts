/**
 * Super-ops: dashboard-only helpers for Justice / Jocelyn–style operational access.
 * Server-side enforcement lives in `super_ops_auth_user_summary` (see Supabase migration).
 */

const ENV_KEY = "VITE_SUPER_OPS_EMAILS";

/** Comma-separated in Vite env; defaults to Justice’s login so production works without extra config. */
const APP_OWNER_ENV_KEY = "VITE_APP_OWNER_EMAILS";

/** Same display names as Clients “settings” allowlist; used when env emails are not set. */
export const SUPER_OPS_FALLBACK_FULL_NAMES = ["Justice Vaughn", "Jocelyn Vaughn"] as const;

const DEFAULT_APP_OWNER_EMAILS = ["justicevaughn7@gmail.com"] as const;

export function parseAppOwnerEmailsFromEnv(): string[] {
  const raw = (import.meta.env[APP_OWNER_ENV_KEY] as string | undefined)?.trim();
  if (!raw) return [...DEFAULT_APP_OWNER_EMAILS];
  const parsed = raw
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_APP_OWNER_EMAILS];
}

/** App owner (Justice): password + Auth email updates for any user; must match Edge Function secret `APP_OWNER_EMAILS`. */
export function isAppOwnerJustice(sessionEmail: string | null | undefined): boolean {
  if (!sessionEmail?.trim()) return false;
  return parseAppOwnerEmailsFromEnv().includes(sessionEmail.trim().toLowerCase());
}

export function parseSuperOpsEmailsFromEnv(): string[] {
  const raw = (import.meta.env[ENV_KEY] as string | undefined)?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Client-side gate for super-ops UI. Prefer `VITE_SUPER_OPS_EMAILS` in production (harder to spoof than full_name).
 * If unset, falls back to profile full name matching {@link SUPER_OPS_FALLBACK_FULL_NAMES}.
 */
export function isSuperOpsUser(
  sessionEmail: string | null | undefined,
  profileFullName: string | null | undefined,
): boolean {
  const emails = parseSuperOpsEmailsFromEnv();
  if (emails.length > 0) {
    if (!sessionEmail?.trim()) return false;
    return emails.includes(sessionEmail.trim().toLowerCase());
  }
  const name = profileFullName?.trim();
  if (!name) return false;
  return (SUPER_OPS_FALLBACK_FULL_NAMES as readonly string[]).includes(name);
}
