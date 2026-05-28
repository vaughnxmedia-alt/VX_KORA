#!/usr/bin/env node
/**
 * Send Brief guide emails to specific free-audit leads (service role).
 * Usage: node scripts/send-guide-emails.mjs "Mont City" "850"
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(webRoot, ".env"));
loadEnvFile(resolve(webRoot, ".env.local"));
loadEnvFile(resolve(webRoot, "../.env"));
loadEnvFile(resolve(webRoot, "../../.env"));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const searchTerms = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["mont city", "850"];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function fetchAudits() {
  const { data, error } = await (
    await fetch(
      `${SUPABASE_URL}/rest/v1/free_audits?select=id,business_name,lead_email_lower,contact_name,website_link,instagram,facebook,tiktok,other_socials,follow_up_status,metadata&order=created_at.desc&limit=100`,
      { headers },
    )
  ).json();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data ?? [];
}

function matchesLead(audit, term) {
  const blob = [
    audit.business_name,
    audit.lead_email_lower,
    audit.contact_name,
    audit.website_link,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes(term.toLowerCase());
}

async function sendGuideByMatch(terms) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-guide-delivery`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      auditIds: [],
      match: terms,
      force: true,
    }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

console.log(`Sending guide email (match: ${searchTerms.join(", ")})...`);
const result = await sendGuideByMatch(searchTerms);
if (!result.ok) {
  console.error(`Failed HTTP ${result.status}`, JSON.stringify(result.body, null, 2));
  process.exit(1);
}

for (const row of result.body?.results ?? []) {
  console.log(`\n→ ${row.business_name ?? row.auditId} (${row.email ?? "no email"})`);
  if (row.ok && row.sent) {
    console.log(`  ✓ Guide sent to ${row.to}`);
  } else if (row.reason === "guide_already_sent") {
    console.log("  · Already sent (force resend may be needed)");
  } else {
    console.log(`  ✗ ${row.error ?? row.reason ?? JSON.stringify(row)}`);
  }
}

console.log("\nDone.");
