import { z } from "zod";

export const familyMemberSchema = z.object({
  relationship: z.enum(["SPOUSE", "COMMON_LAW", "CHILD", "PARENT", "OTHER"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(8),
  accompanying: z.boolean().default(true),
  citizenship: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  passportImageKey: z.string().optional(),
  passportImageMime: z.string().optional(),
  passportVerified: z.boolean().default(false),
  occupationOrGrade: z.string().optional(),
  priorRefusals: z.boolean().default(false),
});

export function computeAutoFields(relationship: string, dob: Date, accompanying: boolean) {
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
  return {
    age,
    dependentEligible: relationship === "CHILD" ? age < 22 : null,
    biometricsStatus: age >= 14 && age <= 79 ? "REQUIRED" : "EXEMPT",
    medicalStatus: accompanying ? "REQUIRED" : "NA",
  };
}

export function familyMemberWarnings(opts: { relationship: string; accompanying: boolean; hasScan: boolean; firstName: string; age: number }) {
  const warnings: string[] = [];
  if (opts.accompanying && !opts.hasScan)
    warnings.push("No passport scan attached for this accompanying member — add one when available (passport details can be edited later).");
  if (opts.relationship === "CHILD" && opts.age >= 22)
    warnings.push(`${opts.firstName} is ${opts.age} — over the dependent-child age limit (22). Verify eligibility (dependent-condition exception only).`);
  if (opts.relationship === "CHILD" && opts.age >= 19)
    warnings.push(`${opts.firstName} is ${opts.age} — approaching/near age-22 lock. Monitor timeline.`);
  return warnings;
}
