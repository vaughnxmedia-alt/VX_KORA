import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface DeliverablePayload {
  deliverable_id: string;
  customer_id: string;
  agent_name: string;
  deliverable_type: string;
  title: string;
  content?: Record<string, unknown>;
  file_url?: string;
}

async function sendTelegramMessage(botToken: string, message: TelegramMessage) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

async function sendTelegramDocument(botToken: string, chatId: string, fileUrl: string, caption: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      document: fileUrl,
      caption: caption,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

function formatDeliverableMessage(payload: DeliverablePayload, customerName: string): string {
  const agentEmoji = {
    "Intake Clarifier": "📋",
    "Research Agent": "🔍",
    "Audience Intelligence": "👥",
    "Brand Identity": "🎨",
    "Content Strategy": "📝",
    "Campaign Builder": "🚀",
    "PDF Report Builder": "📄",
  }[payload.agent_name] || "🤖";

  let message = `${agentEmoji} <b>KORA Deliverable Ready</b>\n\n`;
  message += `<b>Agent:</b> ${payload.agent_name}\n`;
  message += `<b>Client:</b> ${customerName}\n`;
  message += `<b>Type:</b> ${payload.deliverable_type}\n`;
  message += `<b>Title:</b> ${payload.title}\n\n`;

  if (payload.content) {
    if (payload.agent_name === "Content Strategy" && payload.content.content_pillars) {
      message += `<b>Content Pillars:</b>\n`;
      const pillars = payload.content.content_pillars as Array<{ name: string }>;
      pillars.forEach((pillar, i) => {
        message += `  ${i + 1}. ${pillar.name}\n`;
      });
      message += "\n";
    }

    if (payload.agent_name === "Audience Intelligence" && payload.content.persona_name) {
      message += `<b>Persona:</b> ${payload.content.persona_name}\n`;
      if (payload.content.interests) {
        message += `<b>Interests:</b> ${(payload.content.interests as string[]).join(", ")}\n`;
      }
      message += "\n";
    }

    if (payload.agent_name === "Brand Identity") {
      if (payload.content.tone_of_voice) {
        message += `<b>Tone:</b> ${payload.content.tone_of_voice}\n`;
      }
      if (payload.content.positioning_statement) {
        message += `<b>Positioning:</b> ${payload.content.positioning_statement}\n`;
      }
      message += "\n";
    }
  }

  message += `View full deliverable in Mission Control.`;

  return message;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: DeliverablePayload = await req.json();

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("business_name, first_name, last_name, user_id")
      .eq("id", payload.customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error(`Customer not found: ${customerError?.message}`);
    }

    const customerName = customer.business_name || `${customer.first_name} ${customer.last_name}`;

    // Get telegram settings for admins who want notifications
    const { data: telegramSettings, error: settingsError } = await supabase
      .from("kora_telegram_settings")
      .select("chat_id, user_id")
      .eq("is_active", true)
      .eq("notify_on_deliverable", true);

    if (settingsError) {
      console.error("Error fetching telegram settings:", settingsError);
    }

    // Also check if the customer's user has telegram configured
    if (customer.user_id) {
      const { data: customerTelegram } = await supabase
        .from("kora_telegram_settings")
        .select("chat_id")
        .eq("user_id", customer.user_id)
        .eq("is_active", true)
        .single();

      if (customerTelegram && !telegramSettings?.find(s => s.chat_id === customerTelegram.chat_id)) {
        telegramSettings?.push({ chat_id: customerTelegram.chat_id, user_id: customer.user_id });
      }
    }

    if (!telegramSettings || telegramSettings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No telegram recipients configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = formatDeliverableMessage(payload, customerName);

    // Send to all configured recipients
    const results = await Promise.allSettled(
      telegramSettings.map(async (setting) => {
        if (payload.file_url) {
          return sendTelegramDocument(TELEGRAM_BOT_TOKEN, setting.chat_id, payload.file_url, message);
        } else {
          return sendTelegramMessage(TELEGRAM_BOT_TOKEN, {
            chat_id: setting.chat_id,
            text: message,
            parse_mode: "HTML",
          });
        }
      })
    );

    // Update deliverable as sent
    await supabase
      .from("kora_deliverables")
      .update({
        sent_via_telegram: true,
        telegram_sent_at: new Date().toISOString(),
      })
      .eq("id", payload.deliverable_id);

    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.filter(r => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        message: `Sent to ${successCount} recipients` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in telegram-notify:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
