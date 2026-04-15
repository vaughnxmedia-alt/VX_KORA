import { createClient } from "@supabase/supabase-js"

type ClaimResult =
  | { ok: true; customerName: string; customerId: string }
  | { ok: false; reason: "INVALID" | "ALREADY_CLAIMED" | "CONFIG" | "DB" }

function adminClient() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function claimTelegramAccessInvite(
  token: string,
  telegramId: number,
  telegramUsername?: string | null,
): Promise<ClaimResult> {
  const admin = adminClient()
  if (!admin) return { ok: false, reason: "CONFIG" }

  const tokenTrimmed = token.trim().toLowerCase()
  const { data: invite, error: inviteErr } = await admin
    .from("telegram_access_invites")
    .select("id,email,full_name,claimed_at,customer_id")
    .eq("token", tokenTrimmed)
    .maybeSingle()

  if (inviteErr) {
    console.error("[telegram-access-invite] lookup error:", inviteErr)
    return { ok: false, reason: "DB" }
  }
  if (!invite) return { ok: false, reason: "INVALID" }
  if (invite.claimed_at) return { ok: false, reason: "ALREADY_CLAIMED" }

  const email = String(invite.email || "").trim().toLowerCase()
  const fullName = String(invite.full_name || "").trim()
  const firstName = fullName ? fullName.split(" ")[0] : "Telegram"
  const lastName = fullName.includes(" ") ? fullName.split(" ").slice(1).join(" ") : null

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id,business_name,first_name,last_name")
    .eq("email", email)
    .maybeSingle()

  let customerId = existingCustomer?.id as string | undefined
  if (customerId) {
    const { error: updateErr } = await admin
      .from("customers")
      .update({
        telegram_id: telegramId,
        first_name: existingCustomer.first_name || firstName,
        last_name: existingCustomer.last_name || lastName,
        business_name: existingCustomer.business_name || fullName || "KORA Telegram User",
        client_status: "active_client",
      })
      .eq("id", customerId)
    if (updateErr) {
      console.error("[telegram-access-invite] update customer error:", updateErr)
      return { ok: false, reason: "DB" }
    }
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("customers")
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        business_name: fullName || "KORA Telegram User",
        telegram_id: telegramId,
        client_status: "active_client",
      })
      .select("id")
      .single()
    if (insertErr || !inserted?.id) {
      console.error("[telegram-access-invite] insert customer error:", insertErr)
      return { ok: false, reason: "DB" }
    }
    customerId = inserted.id as string
  }

  const { error: claimErr } = await admin
    .from("telegram_access_invites")
    .update({
      claimed_at: new Date().toISOString(),
      claimed_telegram_id: telegramId,
      customer_id: customerId,
    })
    .eq("id", invite.id)
    .is("claimed_at", null)
  if (claimErr) {
    console.error("[telegram-access-invite] claim update error:", claimErr)
    return { ok: false, reason: "DB" }
  }

  const { error: subErr } = await admin
    .from("telegram_subscriptions")
    .update({ access_status: "active" })
    .eq("email", email)
  if (subErr) {
    console.error("[telegram-access-invite] subscription status update error:", subErr)
  }

  const displayName = fullName || telegramUsername || "there"
  return { ok: true, customerName: displayName, customerId }
}

