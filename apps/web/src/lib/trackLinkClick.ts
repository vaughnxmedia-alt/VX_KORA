import { supabase, supabaseIsConfigured } from "@/integrations/supabase/client";

export type TrackLinkClickInput = {
  linkId: string;
  label: string;
  href: string;
  sourcePage?: string;
};

function readBrowserContext(): { referrer: string | null; userAgent: string | null } {
  if (typeof window === "undefined") {
    return { referrer: null, userAgent: null };
  }
  return {
    referrer: document.referrer?.trim().slice(0, 500) || null,
    userAgent: navigator.userAgent?.trim().slice(0, 500) || null,
  };
}

/** Fire-and-forget click tracking for /links. Never throws; safe to call without awaiting navigation. */
export function trackLinkClick(input: TrackLinkClickInput): void {
  if (!supabaseIsConfigured) return;

  const { referrer, userAgent } = readBrowserContext();

  void supabase
    .from("link_clicks")
    .insert({
      link_id: input.linkId.trim().slice(0, 120),
      link_label: input.label.trim().slice(0, 200),
      destination_url: input.href.trim().slice(0, 500),
      source_page: (input.sourcePage ?? "/links").trim().slice(0, 200) || "/links",
      referrer,
      user_agent: userAgent,
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[trackLinkClick]", error.message);
      }
    });
}
