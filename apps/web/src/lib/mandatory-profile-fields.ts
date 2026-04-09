/** Dashboard profile fields we treat as required for the blue alert strip + ops dialog hints. */

export const SETTINGS_PROFILE_HREF = "/dashboard/settings";

/** Pass as Link `state` to open the Account tab. */
export const SETTINGS_ACCOUNT_LINK_STATE = { defaultSettingsTab: "account" as const };

export type MandatoryProfileKey = "name" | "email" | "phone" | "jobTitle" | "role";

const LABELS: Record<MandatoryProfileKey, string> = {
  name: "Display name",
  email: "Email",
  phone: "Phone",
  jobTitle: "Job title",
  role: "Role",
};

export function mandatoryFieldLabel(key: MandatoryProfileKey): string {
  return LABELS[key];
}

export function getMissingCurrentUserProfileFields(input: {
  sessionEmail: string | null | undefined;
  fullName: string | null | undefined;
  phone: string | null | undefined;
  jobTitle: string | null | undefined;
  role: string | null | undefined;
}): MandatoryProfileKey[] {
  const missing: MandatoryProfileKey[] = [];
  if (!input.sessionEmail?.trim()) missing.push("email");
  if (!input.fullName?.trim()) missing.push("name");
  if (!input.phone?.trim()) missing.push("phone");
  if (!input.jobTitle?.trim()) missing.push("jobTitle");
  if (!input.role?.trim()) missing.push("role");
  return missing;
}

export function formatMissingProfileList(keys: MandatoryProfileKey[]): string {
  return keys.map((k) => LABELS[k]).join(", ");
}
