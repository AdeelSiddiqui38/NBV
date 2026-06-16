// Centralized domain constants (SQLite-safe string enums)

export const ROLES = ["ADMIN", "RCIC", "CASE_MANAGER", "PLAN_WRITER", "ACCOUNTANT"] as const;
export type Role = (typeof ROLES)[number];

export const ENGAGEMENT_MODES = {
  SOLE_OWNERSHIP: "A · Sole Ownership (client 100%, pays all)",
  PARTNERSHIP_FINANCIAL: "B · Partnership + NBV financial involvement",
  PARTNERSHIP_SERVICES: "C · Partnership — sweat equity (NBV pays $0)",
} as const;

export const C11_STAGES = [
  "ONBOARDING",
  "CONCEPT",
  "PROPOSAL_DRAFTING",
  "PROPOSAL_APPROVED",
  "INCORPORATION",
  "BANK_CAPITAL",
  "EMPLOYER_PORTAL",
  "WP_PREP",
  "SUBMITTED",
  "DECISION",
  "ESTABLISHMENT",
  "EXTENSION_PR",
  "CLOSED",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  ONBOARDING: "Onboarding",
  CONCEPT: "Concept & Strategy",
  PROPOSAL_DRAFTING: "Proposal Drafting",
  PROPOSAL_APPROVED: "Proposal Approved",
  INCORPORATION: "Incorporation",
  BANK_CAPITAL: "Bank & Capital",
  EMPLOYER_PORTAL: "Employer Portal",
  WP_PREP: "WP Application Prep",
  SUBMITTED: "Submitted / Processing",
  DECISION: "Decision",
  ESTABLISHMENT: "Establishment",
  EXTENSION_PR: "Extension / PR",
  CLOSED: "Closed",
};

export const LEAD_STAGES = [
  "NEW",
  "CONSULT_BOOKED",
  "FEASIBILITY_SENT",
  "QUOTE_SENT",
  "FEE_AGREED",
  "RETAINER_SENT",
  "WON",
  "LOST",
] as const;

export const FOLDER_TAXONOMY: [string, string][] = [
  ["01", "Engagement & Agreements"],
  ["02", "Identity & Personal"],
  ["03", "Entrepreneur Profile"],
  ["04", "Business Proposal"],
  ["05", "Corporate Records"],
  ["06", "Banking & Financial"],
  ["07", "Premises & Contracts"],
  ["08", "Employer Compliance"],
  ["09", "IRCC Application"],
  ["10", "IRCC Correspondence"],
  ["11", "Establishment & Extension"],
  ["12", "Invoices & Receipts"],
  ["13", "Notes & Internal"],
];

export const LIST_PRICE = 30000;
export const FLOOR_PRICE = 22000;
export const RCIC_MAX_DISCOUNT_PCT = 15;

// LICO-style settlement funds table (update annually in Settings; placeholder values)
export const SETTLEMENT_FUNDS: Record<number, number> = {
  1: 14690, 2: 18288, 3: 22483, 4: 27297, 5: 30690, 6: 34917, 7: 38875,
};

export const GOVT_FEES = {
  WORK_PERMIT: 155,
  OPEN_PERMIT_HOLDER: 100,
  STUDY_PERMIT: 150,
  BIOMETRICS_INDIVIDUAL: 85,
  BIOMETRICS_FAMILY_CAP: 170,
  COMPLIANCE_FEE: 230,
} as const;

export const MILESTONE_SPLIT = [
  { label: "M1 — Retainer / file opening", pct: 30 },
  { label: "M2 — Business plan approved", pct: 30 },
  { label: "M3 — Incorporation + bank complete", pct: 25 },
  { label: "M4 — WP submitted", pct: 15 },
];

export function fmtCad(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
