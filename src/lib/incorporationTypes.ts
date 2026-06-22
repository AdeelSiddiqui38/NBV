export type IncDirector = {
  first: string;
  last: string;
  addr: string;
  resident: "yes" | "no";
  role: string;
};

export type IncShareClass = {
  name: string;
  qty: string;
  par: string;
  rights: string;
  custom: string;
};

export type IncorporationData = {
  nameType: "" | "named" | "numbered";
  corpName: string;
  altName1: string;
  altName2: string;
  altName3: string;
  legalEnding: string;
  nuansNumber: string;
  nuansDate: string;
  bizActivity: string;
  regStreet: string;
  regSuite: string;
  regCity: string;
  regPostal: string;
  sameAddress: boolean;
  recStreet: string;
  recCity: string;
  recPostal: string;
  directors: IncDirector[];
  shares: IncShareClass[];
  shareRestrictions: string;
  bizRestrictions: string;
  otherProvisions: string;
  incFirstName: string;
  incLastName: string;
  incAddress: string;
  incPhone: string;
  incEmail: string;
  signDate: string;
  fiscalYearEnd: string;
};

export const EMPTY_INCORPORATION_DATA: IncorporationData = {
  nameType: "",
  corpName: "",
  altName1: "",
  altName2: "",
  altName3: "",
  legalEnding: "",
  nuansNumber: "",
  nuansDate: "",
  bizActivity: "",
  regStreet: "",
  regSuite: "",
  regCity: "",
  regPostal: "",
  sameAddress: true,
  recStreet: "",
  recCity: "",
  recPostal: "",
  directors: [{ first: "", last: "", addr: "", resident: "yes", role: "Director" }],
  shares: [{ name: "Common", qty: "Unlimited", par: "No par value", rights: "Voting and participating", custom: "" }],
  shareRestrictions: "",
  bizRestrictions: "",
  otherProvisions: "",
  incFirstName: "",
  incLastName: "",
  incAddress: "",
  incPhone: "",
  incEmail: "",
  signDate: "",
  fiscalYearEnd: "December 31",
};

export function buildIncorporationPackage(d: IncorporationData, fileNumber: string): string {
  const corpName =
    d.nameType === "numbered" ? "[AUTO-NUMBERED] Alberta Ltd." : `${d.corpName || "CORPORATION NAME"} ${d.legalEnding || ""}`.trim();

  const altNames = [d.altName1, d.altName2, d.altName3].filter(Boolean);

  const regAddr = [d.regStreet, d.regSuite, d.regCity, "Alberta", d.regPostal].filter(Boolean).join(", ");
  const recAddr = d.sameAddress ? "Same as registered office" : [d.recStreet, d.recCity, "Alberta", d.recPostal].filter(Boolean).join(", ");

  const dirsText = d.directors
    .filter((x) => x.first || x.last)
    .map(
      (x, i) =>
        `  ${i + 1}. ${x.first} ${x.last}\n     Role: ${x.role}\n     Address: ${x.addr}\n     Canadian Resident: ${x.resident === "yes" ? "Yes" : "No"}`
    )
    .join("\n\n");

  const sharesText = d.shares
    .filter((x) => x.name)
    .map(
      (x, i) =>
        `  ${i + 1}. ${x.name}\n     Authorized: ${x.qty}\n     Par Value: ${x.par}\n     Rights: ${x.rights}${x.custom ? "\n     Custom: " + x.custom : ""}`
    )
    .join("\n\n");

  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return `
═══════════════════════════════════════════════════════════════
         NBV CRM — ALBERTA INCORPORATION SUBMISSION PACKAGE
                  Case: ${fileNumber} · Generated: ${today}
═══════════════════════════════════════════════════════════════

INSTRUCTIONS: Use this package as your reference when completing
the online Articles of Incorporation with an Alberta Registry Agent
or on CORES at: https://www.alberta.ca/corporate-registry

Filing Fee: $275 CAD (payable to the registry agent)

───────────────────────────────────────────────────────────────
SECTION 1 — CORPORATION NAME
───────────────────────────────────────────────────────────────
Proposed Name:      ${corpName}
Name Type:          ${d.nameType === "numbered" ? "Numbered Company" : "Named Company"}
${d.nameType === "named" ? `NUANS Report #:      ${d.nuansNumber || "N/A"}\nNUANS Report Date:  ${d.nuansDate || "N/A"}` : ""}
${altNames.length ? `Alternate Names (if NUANS report returns conflicts), in order of preference:\n${altNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n")}` : ""}

───────────────────────────────────────────────────────────────
SECTION 2 — NATURE OF BUSINESS
───────────────────────────────────────────────────────────────
${d.bizActivity || "Not specified"}

───────────────────────────────────────────────────────────────
SECTION 3 — REGISTERED OFFICE
───────────────────────────────────────────────────────────────
Address: ${regAddr || "Not provided"}

Records Address: ${recAddr}

───────────────────────────────────────────────────────────────
SECTION 4 — DIRECTORS
───────────────────────────────────────────────────────────────
${dirsText || "No directors entered"}

Canadian Resident Requirement: 25% of directors must be Canadian residents.
(If fewer than 4 directors, at least 1 must be a Canadian resident.)

───────────────────────────────────────────────────────────────
SECTION 5 — AUTHORIZED SHARE STRUCTURE
───────────────────────────────────────────────────────────────
${sharesText || "No share classes entered"}

Transfer Restrictions:  ${d.shareRestrictions || "None"}
Business Restrictions:  ${d.bizRestrictions || "None"}
Other Provisions:       ${d.otherProvisions || "None"}

───────────────────────────────────────────────────────────────
SECTION 6 — INCORPORATOR
───────────────────────────────────────────────────────────────
Name:     ${d.incFirstName} ${d.incLastName}
Address:  ${d.incAddress}
Phone:    ${d.incPhone || "N/A"}
Email:    ${d.incEmail}
Date:     ${d.signDate}

───────────────────────────────────────────────────────────────
SECTION 7 — FISCAL YEAR
───────────────────────────────────────────────────────────────
Fiscal Year End: ${d.fiscalYearEnd}

───────────────────────────────────────────────────────────────
NEXT STEPS AFTER INCORPORATION
───────────────────────────────────────────────────────────────
□  1. Receive Certificate of Incorporation
□  2. Register for CRA Business Number (BN) — canada.ca/CRA
□  3. Open a corporate bank account (bring Certificate + ID)
□  4. Register for GST/HST if revenue > $30,000/year
□  5. File Initial Return / Notice of Directors with AB Registries
□  6. Draft Organizational Minutes (share issuance, officers, banking)
□  7. Obtain any required business licences (City of ${d.regCity || "Alberta"})
□  8. Annual Corporate Return due each year (fee: ~$45)

───────────────────────────────────────────────────────────────
IMPORTANT LINKS
───────────────────────────────────────────────────────────────
Alberta Corporate Registry:   https://www.alberta.ca/corporate-registry
Find a Registry Agent:        https://www.alberta.ca/find-a-registry-agent
NUANS Name Search:            https://www.nuans.com
CRA Business Registration:    https://www.canada.ca/en/revenue-agency

═══════════════════════════════════════════════════════════════
Generated by NBV CRM — Next Bridge Ventures Inc.
This package is for reference only. Verify all information
with your registry agent before filing.
═══════════════════════════════════════════════════════════════
`;
}
