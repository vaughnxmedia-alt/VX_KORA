/**
 * KORA Inspiration API — stub.
 * POST /api/kora/inspiration
 * TODO: Integrate real KORA backend for case studies, internal refs, search refinements.
 */
// Vercel serverless: default export receives (req, res). Add @vercel/node for types.
export interface KoraInspirationBody {
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
  type: string;
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

export default function handler(req: { method?: string; body?: unknown }, res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (o: unknown) => void } }) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const _body = (req.body || {}) as KoraInspirationBody;
  const response: KoraInspirationResponse = {
    suggestions: [
      {
        id: "stub-1",
        type: "case_study",
        title: "Example campaign (stub)",
        summary: "Why it worked: clear CTA, strong visual.",
        rationale: "Relevant for awareness campaigns.",
        url: "https://example.com",
        metadata: {},
      },
      {
        id: "stub-2",
        type: "internal_campaign",
        title: "Past campaign (stub)",
        summary: "Internal reference.",
        rationale: "Similar audience.",
        metadata: {},
      },
    ],
    refinements: ["Try adding industry", "Narrow by platform"],
  };
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(response);
}
