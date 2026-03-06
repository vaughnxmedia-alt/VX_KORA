/**
 * KORA Inspiration API client.
 * POST /api/kora/inspiration — stub; use mock when endpoint unavailable.
 */

export interface KoraInspirationContext {
  query?: string;
  industry?: string;
  audience?: string;
  campaignName?: string;
  tone?: string;
  platform?: string;
  constraints?: string;
  org_id?: string;
}

export interface KoraSuggestion {
  id: string;
  type: "case_study" | "article" | "internal_campaign" | "internal_post" | "report" | "refinement";
  title: string;
  summary?: string;
  url?: string;
  thumbnailUrl?: string | null;
  rationale?: string;
  metadata?: Record<string, unknown>;
}

export interface KoraInspirationResponse {
  suggestions: KoraSuggestion[];
  refinements?: string[];
}

const MOCK_SUGGESTIONS: KoraSuggestion[] = [
  {
    id: "mock-1",
    type: "case_study",
    title: "Example campaign (stub)",
    summary: "Why it worked: clear CTA, strong visual.",
    rationale: "Relevant for awareness campaigns.",
    url: "https://example.com",
    metadata: {},
  },
  {
    id: "mock-2",
    type: "internal_campaign",
    title: "Past campaign (stub)",
    summary: "Internal reference.",
    rationale: "Similar audience.",
    metadata: {},
  },
];

/**
 * Fetch KORA inspiration suggestions. Falls back to mock if endpoint fails.
 */
export async function fetchKoraInspiration(
  context: KoraInspirationContext
): Promise<KoraInspirationResponse> {
  try {
    const res = await fetch("/api/kora/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    if (res.ok) {
      const data = (await res.json()) as KoraInspirationResponse;
      return data;
    }
  } catch {
    // Network or CORS; use mock
  }
  // TODO: Replace with real API integration.
  return {
    suggestions: MOCK_SUGGESTIONS,
    refinements: ["Try adding industry", "Narrow by platform"],
  };
}
