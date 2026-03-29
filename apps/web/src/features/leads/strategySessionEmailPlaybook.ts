/**
 * Copy for Leads UI — keep aligned with
 * supabase/functions/strategy-session-admin-confirm/index.ts
 * and _shared/strategy-session-*-email.ts
 */
export const STRATEGY_SESSION_EMAIL_DEFAULTS = {
  fromDisplayName: "Jah Jah",
  /** Default “from”; production may override via Edge secret STRATEGY_SESSION_FROM_EMAIL */
  fromEmail: "welcome@jahknowspr.com",
  /** Internal copy; override STRATEGY_SESSION_OPS_EMAIL */
  opsEmail: "hello@jahknowspr.com",
  guestSubject: "Confirmed — Your Strategy Session ($150)",
  guestFormat: "HTML email, Georgia/serif body, max-width ~600px, JahKnowsPR / KORA positioning copy.",
  opsSubjectPrefix: "Strategy Session confirmed — ",
  opsFormat: "HTML email, system-ui, internal recap with meeting ID and dashboard link.",
} as const;

export const STRATEGY_SESSION_EMAIL_FLOW = [
  "Public booking: the client books and pays the flow on the site first (Strategy Session).",
  "Their lead appears in the Strategy Session column until someone confirms the slot here.",
  'Click "Confirm meeting and send emails" to send both messages below (Resend).',
  "After emails send, you can move them to Clients from the same card.",
] as const;

export const GUEST_EMAIL_INCLUDES = [
  "Subject: Confirmed — Your Strategy Session ($150)",
  "Greeting with their name; JahKnowsPR / KORA context and $150 session framing",
  "Strategist name, date, time, timezone; Zoom vs in-person line",
  "Next steps: keep email, questionnaire link, logistics note",
  "Footer with public site link",
] as const;

export const OPS_EMAIL_INCLUDES = [
  "Subject: Strategy Session confirmed — {business name}",
  "Confirmation that you approved; client was emailed",
  "Contact email/phone, slot, strategist, format (Zoom / in-person)",
  "Meeting UUID and link back to this dashboard",
] as const;
