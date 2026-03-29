import type { IntakeValues } from "@/features/strategy-session/schema";

/** Merge partial prefill into intake defaults — required strategy fields must be non-empty for zod. */
export function prefillIntakeFromCreativeQuestionnaire(input: {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  scopeOfWork: string;
  audience: string;
  timeline: string;
  budget: string;
}): Partial<IntakeValues> {
  const notes = [
    `Creative & production questionnaire`,
    input.timeline ? `Timeline: ${input.timeline}` : null,
    input.budget ? `Budget: ${input.budget}` : null,
    `Scope of work: ${input.scopeOfWork}`,
    `Audience: ${input.audience}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    businessName: input.businessName.trim(),
    websiteOrSocial: "",
    industry: "Creative & production",
    offerSummary: input.scopeOfWork.trim().slice(0, 4000) || "Creative / production scope (see questionnaire notes).",
    targetAudience: input.audience.trim().slice(0, 4000) || "To be refined in session.",
    currentChallenge: input.scopeOfWork.trim().slice(0, 4000) || "Creative execution and production planning.",
    sessionGoal: "Align on creative and production scope, timeline, budget, and next steps.",
    sessionType: "zoom",
    inPersonLocation: "",
    additionalNotes: notes.slice(0, 4000),
    employeeReferenceCode: "",
  };
}

export function prefillIntakeFromCampaignQuestionnaire(input: {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  goals: string;
  engagement: string;
  budget: string;
}): Partial<IntakeValues> {
  const notes = [
    `Campaign & retainer questionnaire`,
    input.engagement ? `Engagement: ${input.engagement}` : null,
    input.budget ? `Budget: ${input.budget}` : null,
    `Goals: ${input.goals}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    businessName: input.businessName.trim(),
    websiteOrSocial: "",
    industry: "Campaigns & retainers",
    offerSummary: input.goals.trim().slice(0, 4000) || "Campaign or retainer scope (see questionnaire notes).",
    targetAudience: "To be refined in session.",
    currentChallenge: input.goals.trim().slice(0, 4000) || "Campaign planning and retainer fit.",
    sessionGoal: "Align on campaign or retainer goals, scope, and fit.",
    sessionType: "zoom",
    inPersonLocation: "",
    additionalNotes: notes.slice(0, 4000),
    employeeReferenceCode: "",
  };
}

export function prefillIntakeFromKoraPlatformQuestionnaire(input: {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  problemToSolve: string;
  currentStack: string;
  readiness: string;
}): Partial<IntakeValues> {
  const notes = [
    `Full KORA platform access inquiry`,
    input.currentStack?.trim() ? `Current tools / stack: ${input.currentStack.trim()}` : null,
    input.readiness ? `Readiness: ${input.readiness}` : null,
    `What KORA should solve: ${input.problemToSolve.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    businessName: input.businessName.trim(),
    websiteOrSocial: "",
    industry: "Platform / operations",
    offerSummary: input.problemToSolve.trim().slice(0, 4000) || "KORA platform fit and onboarding (see questionnaire).",
    targetAudience: "Internal teams and workflows — refined in session.",
    currentChallenge: input.problemToSolve.trim().slice(0, 4000) || "Workflow, visibility, and system alignment.",
    sessionGoal: "Determine fit for invitation-based KORA platform access and next steps.",
    sessionType: "zoom",
    inPersonLocation: "",
    additionalNotes: notes.slice(0, 4000),
    employeeReferenceCode: "",
  };
}
