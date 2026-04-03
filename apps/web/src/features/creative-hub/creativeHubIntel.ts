import { supabase } from "@/integrations/supabase/client";

export interface CreativeHubIntel {
  blueprint: string;
  audience: string;
  brandStrategy: string;
}

function truncateText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Summaries from Brand Blueprints, Target Audience, and Brand Strategy (dashboard + MC-backed data). */
export async function fetchCreativeHubIntel(): Promise<CreativeHubIntel> {
  const empty: CreativeHubIntel = { blueprint: "", audience: "", brandStrategy: "" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: custRows } = await supabase.from("customers").select("id").eq("user_id", user.id);
  const customerIds = (custRows ?? []).map((c) => c.id);
  if (customerIds.length === 0) return empty;

  const [bpRes, audRes, stratRes] = await Promise.all([
    supabase
      .from("brand_blueprints")
      .select("problem_statement, six_month_vision, brand_personality, target_audience, brand_gaps")
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("audience_analyses")
      .select("overview, core_positioning, audience_psychology, audience_flywheel")
      .in("client_id", customerIds)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("content_strategies")
      .select("growth_strategy, content_pillars, key_tips")
      .in("client_id", customerIds)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const bp = bpRes.data;
  const blueprint = bp
    ? truncateText(
        [bp.problem_statement, bp.six_month_vision, bp.brand_personality, bp.target_audience, bp.brand_gaps]
          .filter(Boolean)
          .join("\n"),
        2000
      )
    : "";

  const aud = audRes.data;
  const audience = aud
    ? truncateText(
        [aud.overview, aud.core_positioning, aud.audience_psychology, aud.audience_flywheel]
          .filter(Boolean)
          .join("\n"),
        2000
      )
    : "";

  const st = stratRes.data;
  let brandStrategy = "";
  if (st) {
    let tips: unknown = st.key_tips;
    if (typeof tips === "string") {
      try {
        tips = JSON.parse(tips || "[]");
      } catch {
        tips = [];
      }
    }
    let pillars: unknown = st.content_pillars;
    if (typeof pillars === "string") {
      try {
        pillars = JSON.parse(pillars || "[]");
      } catch {
        pillars = [];
      }
    }
    const tipsStr = Array.isArray(tips) ? (tips as string[]).slice(0, 12).join("; ") : "";
    const pillarsStr =
      typeof pillars === "object" && pillars !== null
        ? JSON.stringify(pillars).slice(0, 1200)
        : "";
    brandStrategy = truncateText(
      [st.growth_strategy, pillarsStr, tipsStr].filter(Boolean).join("\n"),
      2000
    );
  }

  return { blueprint, audience, brandStrategy };
}
