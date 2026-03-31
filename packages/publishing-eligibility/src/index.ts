export interface EligibilityResult {
  ok: boolean;
  reasons: string[];
}

export function validateSchedulingEligibility(input: {
  hasAccount: boolean;
  hasRequiredScopes: boolean;
  hasValidToken: boolean;
}): EligibilityResult {
  const reasons: string[] = [];
  if (!input.hasAccount) reasons.push("No connected social account.");
  if (!input.hasRequiredScopes) reasons.push("Missing required API scopes.");
  if (!input.hasValidToken) reasons.push("Token expired or invalid.");
  return { ok: reasons.length === 0, reasons };
}
