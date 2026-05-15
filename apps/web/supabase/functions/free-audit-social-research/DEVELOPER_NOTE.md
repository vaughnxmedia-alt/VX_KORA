# Free Audit Social Research: Agent Flow + Fallbacks

## New Agent Flow

1. Normalize submitted sources and gather baseline intake evidence.
2. Run connected/public research collectors (Meta, website, provider, screenshot, Tavily, competitor discovery).
3. Build a strategist profile from evidence:
   - Brand Architecture
   - Business Model
   - Offer Ladder
   - Audience Segments
   - Cultural Context
   - Proof Inventory
   - Conversion Path
   - Content-to-Revenue
4. Write structured agent evidence records back to `audit_social_evidence`.
5. Generate richer findings (diagnosis, business implication, revenue implication, audience implication, source list, produced-by agent, human summary).
6. Keep admin approval flow unchanged (`report_ready` still controls downstream report eligibility).
7. Save strategist summary + structured profile under `free_audits.metadata.social_research`.

## Confidence Model

- Evidence now carries source, inference, and final confidence hints.
- Weighting logic:
  - Source confidence by source type
  - Inference confidence based on inferred vs submitted source
  - Final confidence blended with existing evidence confidence

## Backward-Compatible Fallbacks

- If new schema columns are missing:
  - Evidence insertion retries with legacy payload.
  - Findings insertion retries with legacy payload.
- If strategist agent synthesis fails:
  - The system builds a deterministic fallback strategist profile.
- If any agent stage degrades:
  - Partial audit still returns; missing structured sections are marked as fallback/unavailable rather than crashing UI.
