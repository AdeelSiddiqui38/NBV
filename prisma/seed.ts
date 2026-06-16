import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const FOLDERS: [string, string][] = [
  ["01", "Engagement & Agreements"], ["02", "Identity & Personal"], ["03", "Entrepreneur Profile"],
  ["04", "Business Proposal"], ["05", "Corporate Records"], ["06", "Banking & Financial"],
  ["07", "Premises & Contracts"], ["08", "Employer Compliance"], ["09", "IRCC Application"],
  ["10", "IRCC Correspondence"], ["11", "Establishment & Extension"], ["12", "Invoices & Receipts"],
  ["13", "Notes & Internal"],
];

function d(s: string) { return new Date(s); }
function future(days: number) { return new Date(Date.now() + days * 86400000); }

async function main() {
  console.log("Seeding…");

  // ── Users ──
  const pw = await bcrypt.hash("NbvAdmin#2026", 10);
  const pwStaff = await bcrypt.hash("NbvStaff#2026", 10);
  const amrit = await db.user.create({ data: { email: "amrit@nextbridgeventures.ca", name: "Amrit S.", role: "ADMIN", rcicLicenseNo: "R-712345", passwordHash: pw, mfaEnabled: true, internalRate: 150 } });
  const noor = await db.user.create({ data: { email: "noor@nextbridgeventures.ca", name: "Noor H.", role: "RCIC", rcicLicenseNo: "R-718122", passwordHash: pwStaff, mfaEnabled: true, internalRate: 130 } });
  const jodi = await db.user.create({ data: { email: "jodi@nextbridgeventures.ca", name: "Jodi T.", role: "CASE_MANAGER", passwordHash: pwStaff, internalRate: 60 } });
  await db.user.create({ data: { email: "sara.k@contractor.com", name: "Sara K.", role: "PLAN_WRITER", passwordHash: pwStaff, internalRate: 75 } });
  await db.user.create({ data: { email: "books@nbvaccounting.ca", name: "Priya B.", role: "ACCOUNTANT", passwordHash: pwStaff, mfaEnabled: true } });

  // ── Expense categories ──
  const cats: Record<string, string> = {};
  for (const [name, budget, itc] of [
    ["Marketing & Advertising", 3000, "FULL"], ["Referral & Commissions", null, "NONE"],
    ["Banking & Merchant Fees", 200, "NONE"], ["Professional Services", 800, "FULL"],
    ["Licenses & Memberships", 300, "FULL"], ["Software & Subscriptions", 450, "FULL"],
    ["Office & Rent", 2400, "FULL"], ["Salaries & Contractors", 4200, "NONE"],
    ["Travel & Client Development", 500, "MEALS_50"], ["Telecom & Communications", 250, "FULL"],
  ] as const) {
    const c = await db.expenseCategory.create({ data: { name: name as string, monthlyBudget: budget as number | null, itcRule: itc as string } });
    cats[name as string] = c.id;
  }
  const monthAgo = (days: number) => new Date(Date.now() - days * 86400000);
  await db.expense.createMany({
    data: [
      { categoryId: cats["Marketing & Advertising"], vendor: "Google Ads", date: monthAgo(2), amount: 1240, gstHstItc: 59.05, status: "INBOX", source: "EMAIL_IN", campaign: "C11 Nigeria Q2" },
      { categoryId: cats["Banking & Merchant Fees"], vendor: "RBC service fees", date: monthAgo(3), amount: 42.5, gstHstItc: 0, status: "INBOX", source: "EMAIL_IN" },
      { categoryId: cats["Travel & Client Development"], vendor: "Client dinner — Mbeki", date: monthAgo(4), amount: 186.4, gstHstItc: 4.44, status: "INBOX", source: "UPLOAD" },
      { categoryId: cats["Office & Rent"], vendor: "Office rent", date: monthAgo(11), amount: 2400, gstHstItc: 114.29, status: "CONFIRMED", source: "RECURRING" },
      { categoryId: cats["Software & Subscriptions"], vendor: "CRM + software stack", date: monthAgo(11), amount: 385, gstHstItc: 18.33, status: "CONFIRMED", source: "RECURRING" },
      { categoryId: cats["Marketing & Advertising"], vendor: "Nigeria webinar platform", date: monthAgo(20), amount: 1270, gstHstItc: 60.48, status: "CONFIRMED", campaign: "C11 Nigeria Q2" },
      { categoryId: cats["Salaries & Contractors"], vendor: "Plan-writer contractors", date: monthAgo(12), amount: 3800, gstHstItc: 0, status: "CONFIRMED" },
    ],
  });

  // ════════ CLIENT 1: Adeyemi — flagship case (Mode A, Employer Portal stage) ════════
  const maxwell = await db.client.create({
    data: {
      clientNumber: "NBV-C-2026-0003", firstName: "Maxwell", lastName: "Adeyemi",
      email: "m.adeyemi@example.com", phone: "+234 801 555 0192", country: "Nigeria",
      dateOfBirth: d("1985-02-14"), maritalStatus: "Married", passportExpiry: d("2031-03-20"),
      pipedaConsentAt: d("2026-02-03"), source: "Lagos Partners (agent)",
      familyMembers: {
        create: [
          { relationship: "SPOUSE", firstName: "Grace", lastName: "Adeyemi", dateOfBirth: d("1988-07-22"), passportExpiry: d("2029-09-10"), accompanying: true, biometricsStatus: "BOOKED", medicalStatus: "BOOKED", docsPct: 70, citizenship: "Nigeria" },
          { relationship: "CHILD", firstName: "Daniel", lastName: "Adeyemi", dateOfBirth: d("2016-11-03"), passportExpiry: d("2028-01-15"), accompanying: true, dependentEligible: true, biometricsStatus: "EXEMPT", medicalStatus: "BOOKED", docsPct: 60, occupationOrGrade: "Grade 4" },
          { relationship: "CHILD", firstName: "Ada", lastName: "Adeyemi", dateOfBirth: d("2023-04-18"), passportExpiry: d("2026-11-30"), accompanying: true, dependentEligible: true, biometricsStatus: "EXEMPT", medicalStatus: "NA", docsPct: 55 },
        ],
      },
    },
  });

  const case1 = await db.case.create({
    data: {
      fileNumber: "NBV-2026-0003", clientId: maxwell.id, caseType: "C11_NEW",
      engagementMode: "SOLE_OWNERSHIP", currentStage: "EMPLOYER_PORTAL",
      rcicId: amrit.id, caseManagerId: jodi.id, agreedFee: 14500, openedAt: d("2026-02-03"),
      folders: { create: FOLDERS.map(([code, name]) => ({ code, name })) },
    },
  });

  await db.businessProposal.create({
    data: {
      caseId: case1.id, sector: "Transportation & Logistics", locationCity: "Calgary", locationProv: "AB",
      state: "FINAL_LOCKED", currentVersion: "v1.3", writerName: "Sara K.",
      rcicSignedOffAt: d("2026-03-20"), clientApprovedAt: d("2026-03-24"),
      finalSha256: "9f2ab8…locked", benefitAngles: "jobs,regional",
      plannedHires: {
        create: [
          { title: "Dispatcher", noc: "14404", teer: 4, salary: 58000, startQuarter: "2026-Q4" },
          { title: "Delivery Driver", noc: "75201", teer: 5, salary: 62000, startQuarter: "2027-Q1" },
          { title: "Delivery Driver", noc: "75201", teer: 5, salary: 62000, startQuarter: "2027-Q2" },
        ],
      },
    },
  });

  const corp1 = await db.corporateEntity.create({
    data: {
      caseId: case1.id, legalName: "Maple Logistics Solutions Inc.", jurisdiction: "Alberta",
      nuansRef: "NUANS-2026-118842", certificateNo: "2026-44781", incorporatedAt: d("2026-04-10"),
      businessNumber: "784321907", craAccounts: "RC0001,RP0001,RT0001", stage: "COMPLETE",
      annualReturnDue: d("2027-04-10"),
      shareholders: { create: [{ name: "Maxwell Adeyemi", party: "CLIENT", pct: 100 }] },
    },
  });
  const bank1 = await db.bankAccount.create({
    data: { corpId: corp1.id, bankName: "RBC Business", status: "VERIFIED", maskedNo: "4471", openedAt: d("2026-05-02") },
  });
  await db.capitalTransaction.createMany({
    data: [
      { bankAccountId: bank1.id, date: d("2026-04-28"), amountCad: 125000, party: "CLIENT", source: "Property sale (Lagos)", fxNote: "NGN wire, FX receipt on file" },
      { bankAccountId: bank1.id, date: d("2026-05-02"), amountCad: 90000, party: "CLIENT", source: "Personal savings (GTB)", fxNote: "12-mo statements attached" },
    ],
  });
  await db.employerPortalRecord.create({
    data: {
      caseId: case1.id, enrolledAt: d("2026-06-05"), jobTitle: "General Manager", noc: "00015", teer: 0,
      salary: 95000, offerSubmittedAt: d("2026-06-09"), complianceFeePaidAt: d("2026-06-09"), aNumber: null,
    },
  });
  await db.deadline.createMany({
    data: [
      { caseId: case1.id, label: "A-number follow-up (Employer Portal)", dueDate: future(7), kind: "GENERAL" },
      { caseId: case1.id, label: "Ada's passport renewal before visa issuance", dueDate: d("2026-09-30"), kind: "GENERAL" },
    ],
  });
  await db.caseStageLog.createMany({
    data: [
      { caseId: case1.id, toStage: "ONBOARDING", note: "Retainer signed $14,500 (Q-2026-008 v2). Conflict check clear. ID verified. IMM 5476 signed. $5,800 to trust.", byUserId: amrit.id, at: d("2026-02-03") },
      { caseId: case1.id, fromStage: "ONBOARDING", toStage: "CONCEPT", note: "Sector workshop: last-mile logistics, Calgary. Benefit: jobs + regional.", byUserId: amrit.id, at: d("2026-02-12") },
      { caseId: case1.id, fromStage: "CONCEPT", toStage: "PROPOSAL_DRAFTING", byUserId: jodi.id, at: d("2026-02-20") },
      { caseId: case1.id, fromStage: "PROPOSAL_DRAFTING", toStage: "PROPOSAL_APPROVED", note: "v1.3 FINAL locked, client approval email on file.", byUserId: amrit.id, at: d("2026-04-02") },
      { caseId: case1.id, fromStage: "PROPOSAL_APPROVED", toStage: "INCORPORATION", byUserId: jodi.id, at: d("2026-04-05") },
      { caseId: case1.id, fromStage: "INCORPORATION", toStage: "BANK_CAPITAL", note: "Incorporation complete, BN received, minute book assembled.", byUserId: jodi.id, at: d("2026-04-24") },
      { caseId: case1.id, fromStage: "BANK_CAPITAL", toStage: "EMPLOYER_PORTAL", note: "Capital verified $215k. Dual-funding readiness COMPLETE.", byUserId: amrit.id, at: d("2026-06-05") },
    ],
  });
  await db.task.createMany({
    data: [
      { title: "RCIC sign-off — R205(a) submission letter v2", caseId: case1.id, assigneeId: amrit.id, dueDate: future(5), priority: "HIGH" },
      { title: "Check Employer Portal for A-number", caseId: case1.id, assigneeId: jodi.id, dueDate: future(2), priority: "HIGH" },
    ],
  });
  const inv1 = await db.invoice.create({
    data: {
      number: "NBV-INV-2026-0019", clientId: maxwell.id, caseId: case1.id, milestone: "M1 — File opening",
      status: "PAID", issueDate: d("2026-02-04"), subtotal: 4000, taxRate: 0.05, total: 4200,
      lines: { create: [{ kind: "FEE", description: "C11 package — milestone 1 (30%)", amount: 4000 }] },
      payments: { create: [{ date: d("2026-02-05"), amount: 4200, method: "wire", reference: "W8821" }] },
    },
  });
  await db.invoice.create({
    data: {
      number: "NBV-INV-2026-0028", clientId: maxwell.id, caseId: case1.id, milestone: "M2 — Proposal approved",
      status: "PAID", issueDate: d("2026-03-25"), subtotal: 3000, taxRate: 0.05, total: 3150,
      lines: { create: [{ kind: "FEE", description: "C11 package — milestone 2 (30%)", amount: 3000 }] },
      payments: { create: [{ date: d("2026-03-26"), amount: 3150, method: "e-transfer", reference: "E2231" }] },
    },
  });
  await db.trustTransaction.createMany({
    data: [
      { clientId: maxwell.id, type: "DEPOSIT", amount: 5800, date: d("2026-02-03"), method: "wire", reference: "W8821", memo: "Retainer advance", enteredById: jodi.id, approvedById: amrit.id },
      { clientId: maxwell.id, type: "TRANSFER_TO_OPERATING", amount: 4200, date: d("2026-02-05"), memo: "Earned vs INV-0019", enteredById: jodi.id, approvedById: amrit.id },
      { clientId: maxwell.id, type: "DEPOSIT", amount: 5850, date: d("2026-03-25"), memo: "M2 + disbursement float", enteredById: jodi.id, approvedById: amrit.id },
      { clientId: maxwell.id, type: "TRANSFER_TO_OPERATING", amount: 3150, date: d("2026-03-26"), memo: "Earned vs INV-0028", enteredById: jodi.id, approvedById: amrit.id },
      { clientId: maxwell.id, type: "DISBURSEMENT", amount: 525, date: d("2026-04-10"), memo: "AB incorporation fee + NUANS (receipts in folder 12)", enteredById: jodi.id, approvedById: amrit.id },
    ],
  });
  // a few documents
  const f = async (code: string) => (await db.folder.findFirst({ where: { caseId: case1.id, code } }))!.id;
  await db.documentItem.createMany({
    data: [
      { caseId: case1.id, folderId: await f("01"), docType: "RETAINER", party: "CLIENT", name: "2026-02-03_Retainer_Adeyemi_v1.pdf", status: "APPROVED", locked: true, sha256: "ab12…" },
      { caseId: case1.id, folderId: await f("02"), docType: "PASSPORT", party: "CLIENT", name: "2026-02-04_Passport_Adeyemi_v2.pdf", status: "APPROVED", expiryDate: d("2031-03-20"), version: 2 },
      { caseId: case1.id, folderId: await f("04"), docType: "BUSINESS_PLAN", party: "CLIENT", name: "2026-04-02_BusinessPlan_FINAL_v1.3.pdf", status: "APPROVED", locked: true, sha256: "9f2a…" },
      { caseId: case1.id, folderId: await f("05"), docType: "ARTICLES", party: "CORP", name: "2026-04-10_Articles_MapleLogistics_v1.pdf", status: "APPROVED" },
      { caseId: case1.id, folderId: await f("06"), docType: "BANK_CONFIRMATION", party: "CORP", name: "2026-05-02_BankConfirmation_RBC_v1.pdf", status: "APPROVED" },
      { caseId: case1.id, folderId: await f("06"), docType: "SOURCE_OF_FUNDS", party: "CLIENT", name: "2026-04-28_SaleDeed_Lagos_v1.pdf", status: "APPROVED" },
      { caseId: case1.id, folderId: await f("08"), docType: "COMPLIANCE_FEE", party: "CORP", name: "2026-06-09_ComplianceFeeReceipt_v1.pdf", status: "APPROVED" },
      { caseId: case1.id, folderId: await f("02"), docType: "POLICE_CERT", party: "CLIENT", name: "2026-06-08_PoliceCertificate_Adeyemi_v1.pdf", status: "UNDER_REVIEW" },
      { caseId: case1.id, folderId: await f("09"), docType: "SUBMISSION_LETTER", party: "NBV", name: "2026-06-10_R205aLetter_draft_v2.docx", status: "RECEIVED" },
    ],
  });

  // ════════ CLIENT 2: Hosseini — Mode B 70:30, established, extension window ════════
  const amir = await db.client.create({
    data: {
      clientNumber: "NBV-C-2024-0017", firstName: "Amir", lastName: "Hosseini", country: "Iran",
      email: "amir.h@example.com", dateOfBirth: d("1979-09-30"), maritalStatus: "Married",
      passportExpiry: d("2026-08-15"), pipedaConsentAt: d("2024-09-01"),
      familyMembers: {
        create: [
          { relationship: "SPOUSE", firstName: "Leila", lastName: "Hosseini", dateOfBirth: d("1983-03-12"), accompanying: true, docsPct: 100, biometricsStatus: "DONE", medicalStatus: "PASSED" },
          { relationship: "CHILD", firstName: "Kian", lastName: "Hosseini", dateOfBirth: d("2012-06-25"), accompanying: true, dependentEligible: true, docsPct: 100, biometricsStatus: "DONE", medicalStatus: "PASSED", occupationOrGrade: "Grade 8" },
        ],
      },
    },
  });
  const case2 = await db.case.create({
    data: {
      fileNumber: "NBV-2024-0017", clientId: amir.id, caseType: "C11_NEW",
      engagementMode: "PARTNERSHIP_FINANCIAL", currentStage: "ESTABLISHMENT",
      rcicId: amrit.id, caseManagerId: jodi.id, agreedFee: 24000, openedAt: d("2024-09-10"),
      folders: { create: FOLDERS.map(([code, name]) => ({ code, name })) },
    },
  });
  const corp2 = await db.corporateEntity.create({
    data: {
      caseId: case2.id, legalName: "2189744 Alberta Ltd.", jurisdiction: "Alberta",
      certificateNo: "2024-89231", incorporatedAt: d("2024-11-20"), businessNumber: "712908443",
      craAccounts: "RC0001,RP0001,RT0001", stage: "COMPLETE", annualReturnDue: d("2026-07-15"),
      shareholders: {
        create: [
          { name: "Amir Hosseini", party: "CLIENT", pct: 70 },
          { name: "Next Bridge Ventures Inc.", party: "NBV", pct: 30 },
        ],
      },
    },
  });
  await db.partnershipDeal.create({
    data: {
      corpId: corp2.id, financialInvolvement: true, clientPct: 70, nbvPct: 30,
      feeArrangement: "REDUCED_FEES", status: "ACTIVE",
      coiDisclosure: true, ilaStatus: "CONFIRMED", clientConsent: true, retainerAddendum: true,
      nbvCapitalCommitted: 45000, nbvCapitalPaid: 45000,
      costSplits: {
        create: [
          { category: "INCORPORATION", clientPct: 70, nbvPct: 30 },
          { category: "GOVT_FEES", clientPct: 100, nbvPct: 0 },
          { category: "BUSINESS_CAPITAL", clientPct: 70, nbvPct: 30 },
        ],
      },
      distributions: {
        create: [
          { declaredAt: d("2025-12-15"), totalAmount: 10000, clientShare: 7000, nbvShare: 3000, paidAt: d("2025-12-20") },
          { declaredAt: d("2026-03-31"), totalAmount: 11500, clientShare: 8050, nbvShare: 3450, paidAt: d("2026-04-05") },
        ],
      },
    },
  });
  const bank2 = await db.bankAccount.create({
    data: { corpId: corp2.id, bankName: "BMO Business", status: "VERIFIED", maskedNo: "2218", openedAt: d("2025-01-10") },
  });
  await db.capitalTransaction.createMany({
    data: [
      { bankAccountId: bank2.id, date: d("2025-01-15"), amountCad: 105000, party: "CLIENT", source: "Savings + property sale" },
      { bankAccountId: bank2.id, date: d("2025-01-15"), amountCad: 45000, party: "NBV", source: "NBV capital contribution (Mode B 70:30)" },
    ],
  });
  await db.workPermitRecord.create({
    data: {
      caseId: case2.id, submittedAt: d("2025-02-20"), applicationNo: "W-309112847",
      biometricsDoneAt: d("2025-03-10"), decision: "APPROVED", decisionAt: d("2025-04-22"),
      permitStart: d("2025-05-09"), permitEnd: d("2026-10-09"),
    },
  });
  await db.deadline.createMany({
    data: [
      { caseId: case2.id, label: "WP expiry — extension or exit decision", dueDate: d("2026-10-09"), kind: "WP_EXPIRY" },
      { caseId: case2.id, label: "Annual return — 2189744 Alberta Ltd.", dueDate: d("2026-07-15"), kind: "GENERAL" },
    ],
  });
  await db.task.createMany({
    data: [
      { title: "Extension strategy meeting — extend vs AB PNP entrepreneur", caseId: case2.id, assigneeId: amrit.id, dueDate: future(5), priority: "HIGH" },
      { title: "Collect payroll records for hires 1 & 2 (extension evidence)", caseId: case2.id, assigneeId: jodi.id, dueDate: future(12), priority: "MED" },
    ],
  });
  await db.trustTransaction.createMany({
    data: [
      { clientId: amir.id, type: "DEPOSIT", amount: 2500, date: d("2026-05-12"), memo: "Extension retainer advance", enteredById: jodi.id, approvedById: amrit.id },
    ],
  });
  await db.invoice.create({
    data: {
      number: "NBV-INV-2026-0036", clientId: amir.id, caseId: case2.id, milestone: "Extension retainer",
      status: "OVERDUE", issueDate: d("2026-05-12"), dueDate: d("2026-05-26"), subtotal: 3048, taxRate: 0.05, total: 3200,
      lines: { create: [{ kind: "FEE", description: "C11 extension package", amount: 3048 }] },
    },
  });

  // ════════ CLIENT 3: Wang — Mode B proposed, COI gate incomplete, 51% fixed ════════
  const kevin = await db.client.create({
    data: {
      clientNumber: "NBV-C-2026-0007", firstName: "Kevin", lastName: "Wang", country: "China",
      email: "kwang@example.com", dateOfBirth: d("1990-12-08"), maritalStatus: "Single",
      pipedaConsentAt: d("2026-05-28"),
    },
  });
  const case3 = await db.case.create({
    data: {
      fileNumber: "NBV-2026-0007", clientId: kevin.id, caseType: "C11_NEW",
      engagementMode: "PARTNERSHIP_FINANCIAL", currentStage: "PROPOSAL_DRAFTING",
      rcicId: noor.id, caseManagerId: jodi.id, agreedFee: 18000, openedAt: d("2026-05-28"),
      folders: { create: FOLDERS.map(([code, name]) => ({ code, name })) },
    },
  });
  await db.businessProposal.create({
    data: {
      caseId: case3.id, sector: "IT Managed Services", locationCity: "Burnaby", locationProv: "BC",
      state: "DRAFTING", currentVersion: "v0.4", writerName: "Devon R.", benefitAngles: "innovation,jobs",
      plannedHires: {
        create: [
          { title: "Systems Technician", noc: "22220", teer: 2, salary: 64000, startQuarter: "2027-Q1" },
          { title: "Help Desk Analyst", noc: "22221", teer: 2, salary: 54000, startQuarter: "2027-Q2" },
        ],
      },
    },
  });
  const corp3 = await db.corporateEntity.create({
    data: {
      caseId: case3.id, legalName: "WangTech Solutions Inc. (reserved)", jurisdiction: "British Columbia",
      nuansRef: "BC-NR-2026-77120", stage: "NAME_SEARCH",
      shareholders: {
        create: [
          { name: "Kevin Wang", party: "CLIENT", pct: 60 },
          { name: "Next Bridge Ventures Inc.", party: "NBV", pct: 40 },
        ],
      },
    },
  });
  await db.partnershipDeal.create({
    data: {
      corpId: corp3.id, financialInvolvement: true, clientPct: 60, nbvPct: 40,
      feeArrangement: "REDUCED_FEES", status: "COI_GATE",
      coiDisclosure: true, ilaStatus: "PENDING", clientConsent: false, retainerAddendum: true,
      nbvCapitalCommitted: 15000, nbvCapitalPaid: 0,
      costSplits: {
        create: [
          { category: "INCORPORATION", clientPct: 60, nbvPct: 40 },
          { category: "GOVT_FEES", clientPct: 100, nbvPct: 0 },
          { category: "BUSINESS_CAPITAL", clientPct: 60, nbvPct: 40 },
          { category: "OPERATING_TOPUP", clientPct: 60, nbvPct: 40 },
        ],
      },
    },
  });
  await db.task.createMany({
    data: [
      { title: "Follow up ILA confirmation — Chen Law LLP", caseId: case3.id, assigneeId: amrit.id, dueDate: future(6), priority: "MED" },
      { title: "Draft proposal v1.0 — financial projections", caseId: case3.id, assigneeId: jodi.id, dueDate: future(8), priority: "MED" },
    ],
  });
  await db.trustTransaction.create({
    data: { clientId: kevin.id, type: "DEPOSIT", amount: 6000, date: d("2026-06-02"), memo: "Retainer advance (agreed fee $18,000 — equity consideration)", enteredById: jodi.id, approvedById: noor.id },
  });
  await db.invoice.create({
    data: {
      number: "NBV-INV-2026-0042", clientId: kevin.id, caseId: case3.id, milestone: "M1 — File opening",
      status: "PAID", issueDate: d("2026-06-02"), subtotal: 4000, taxRate: 0.05, total: 4200,
      lines: { create: [{ kind: "FEE", description: "C11 package — milestone 1", amount: 4000 }] },
      payments: { create: [{ date: d("2026-06-03"), amount: 4200, method: "e-transfer", reference: "E2240" }] },
    },
  });

  // ── Leads + quotes ──
  const mbeki = await db.lead.create({
    data: { name: "Joseph Mbeki", country: "South Africa", sector: "Restaurant", city: "Calgary", province: "AB", source: "Website", scorecard: "GREEN", scorecardNote: "Capital ~$180k · 12 yrs F&B mgmt", stage: "CONSULT_BOOKED", icaSigned: true, icaFee: 250 },
  });
  await db.feeQuote.create({
    data: { number: "Q-2026-037", leadId: mbeki.id, listPrice: 30000, status: "DRAFT" },
  });
  const kim = await db.lead.create({
    data: { name: "David Kim", country: "South Korea", sector: "Auto repair", province: "AB", source: "Referral", scorecard: "GREEN", stage: "QUOTE_SENT" },
  });
  await db.feeQuote.create({
    data: {
      number: "Q-2026-031", leadId: kim.id, version: 3, listPrice: 30000, status: "NEGOTIATING", sentAt: d("2026-06-06"), expiresAt: future(24),
      adjustments: { create: [{ type: "MARKET_ADJ", amount: -3000, reason: "Competitor quote matched" }] },
    },
  });
  const petrova = await db.lead.create({
    data: { name: "Elena Petrova", country: "Serbia", sector: "Bakery purchase", province: "MB", source: "Website", scorecard: "AMBER", scorecardNote: "Business-purchase variant — valuation needed", stage: "QUOTE_SENT" },
  });
  await db.feeQuote.create({
    data: {
      number: "Q-2026-035", leadId: petrova.id, version: 2, listPrice: 30000, status: "PENDING_APPROVAL", requiresApproval: true,
      adjustments: {
        create: [
          { type: "PCT_DISCOUNT", amount: -4500, reason: "15% market adjustment" },
          { type: "SCOPE_REMOVED", amount: -2500, reason: "Client self-managing bank account opening" },
        ],
      },
    },
  });
  await db.lead.createMany({
    data: [
      { name: "Sofia Alvarez", country: "Mexico", sector: "Cleaning services", province: "AB", source: "WhatsApp", scorecard: "AMBER", scorecardNote: "Capital thin", stage: "NEW" },
      { name: "Sam Osei", country: "Ghana", sector: "Trucking", province: "SK", source: "Webinar — Nigeria Q2", scorecard: "GREEN", scorecardNote: "Rural benefit strong", stage: "FEASIBILITY_SENT" },
      { name: "Li Wei", country: "China", sector: "E-commerce logistics", province: "ON", source: "Website", stage: "CONSULT_BOOKED", icaSigned: true, icaFee: 250 },
    ],
  });

  // ── Activity log snapshots ──
  await db.activityLog.createMany({
    data: [
      { actorId: jodi.id, actorName: "Jodi T.", entityType: "case", entityId: case1.id, action: "portal_offer_submitted", detail: "NBV-2026-0003: offer + $230 fee logged; A-number gate active" },
      { actorId: amrit.id, actorName: "Amrit S.", entityType: "trust", action: "trust_approved", detail: "Wang deposit $6,000 e-transfer E2240" },
      { actorName: "System", entityType: "validator", action: "validator_block", detail: "WangTech original 50/50 draft blocked (<51%); restructured 60:40 with NBV partnership" },
      { actorId: amrit.id, actorName: "Amrit S.", entityType: "deal", action: "coi_step", detail: "WangTech 60:40 — ILA referral to Chen Law LLP; gate 2/4" },
      { actorId: amrit.id, actorName: "Amrit S.", entityType: "trust", action: "reconciliation", detail: "May: trust balances = bank ✓ variance $0" },
    ],
  });

  console.log("Seed complete.");
  console.log("Logins:  amrit@nextbridgeventures.ca / NbvAdmin#2026 (Admin)");
  console.log("         jodi@nextbridgeventures.ca / NbvStaff#2026 (Case Manager)");
}

main().finally(() => db.$disconnect());
