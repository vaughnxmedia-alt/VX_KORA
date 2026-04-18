import * as z from "zod";

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
] as const;

export const intakeSchema = z
  .object({
    fullName: z.string().min(2, "Name is required"),
    businessName: z.string().min(1, "Business name is required"),
    email: z.string().email("Valid email required"),
    phone: z.string().min(7, "Phone number required"),
    websiteOrSocial: z.string().optional(),
    industry: z.string().min(1, "Industry is required"),
    offerSummary: z.string().min(1, "Tell us what you offer"),
    targetAudience: z.string().min(1, "Target audience is required"),
    currentChallenge: z.string().min(1, "Please describe your challenge"),
    sessionGoal: z.string().min(1, "What do you hope to gain?"),
    sessionType: z.enum(["zoom", "in_person"]),
    inPersonLocation: z.string().optional(),
    additionalNotes: z.string().optional(),
    /** Optional — maps to strategist calendar; leave blank for default host */
    employeeReferenceCode: z.string().max(32).optional(),
    /** Optional — server-validated complimentary session code */
    promoCode: z.string().max(32).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sessionType === "in_person" && !data.inPersonLocation?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preferred location is required for in-person sessions",
        path: ["inPersonLocation"],
      });
    }
  });

export type IntakeValues = z.infer<typeof intakeSchema>;
