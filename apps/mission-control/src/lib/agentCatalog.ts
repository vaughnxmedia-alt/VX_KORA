/**
 * Pipeline agents shown in Mission Control: each maps to concrete outcomes the system
 * must produce (aligned with worker / Telegram flows).
 */
export const AGENT_DELIVERABLES: Record<string, readonly string[]> = {
  "intake-clarifier": [
    "Capture and normalize onboarding answers into a structured client profile",
    "Resolve open clarifying questions so downstream agents have complete context",
    "Hand off a clean tenant record linked to Telegram or portal identity",
  ],
  "source-discovery": [
    "Propose candidate sources (RSS, channels, pages, links) matched to tenant strategy",
    "De-duplicate and rank sources before human or auto approval",
  ],
  "source-processing": [
    "Ingest approved sources: fetch, transcribe, translate, and chunk content",
    "Emit structured intelligence items ready for pool / RAG routing",
  ],
  "content-strategy": [
    "Turn approved intelligence into content strategy objects and plan suggestions",
    "Prepare Telegram-ready briefings tied to tenant goals",
  ],
  "campaign-assembly": [
    "Convert approved strategies into campaign options on the main site",
    "Attach logistics and conversion checkpoints for Creative Hub handoff",
  ],
  "telegram-delivery": [
    "Deliver scheduled briefings, insights, and alerts to the user Telegram thread",
    "Respect frequency, timezone, and content toggles per tenant",
  ],
  "rag-intelligence": [
    "Maintain tenant-scoped RAG chunks in `kora_tenant_rag_documents`",
    "Track usage and strategy linkage so Creative Hub / KORA bot answers stay grounded",
  ],
}
