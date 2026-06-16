# NBV CRM — Production Application (Phase 1 scaffold)

Next.js 14 (App Router) · TypeScript · Prisma · Tailwind CSS
Dev database: SQLite (zero-setup). Production: PostgreSQL in a Canadian region (see below).

## Run locally

```bash
cd app
npm install
npm run setup     # prisma generate + db push + seed demo data
npm run dev       # http://localhost:3000
```

**Demo logins**
| Login ID | Password | Role |
|---|---|---|
| amrit@nextbridgeventures.ca | `NbvAdmin#2026` | Admin + RCIC |
| noor@nextbridgeventures.ca | `NbvStaff#2026` | RCIC |
| jodi@nextbridgeventures.ca | `NbvStaff#2026` | Case Manager |
| sara.k@contractor.com | `NbvStaff#2026` | Plan Writer |
| books@nbvaccounting.ca | `NbvStaff#2026` | Accountant |

## What's implemented (and verified by smoke tests)

- 🔐 **Auth**: per-user login (bcrypt-hashed passwords), JWT session cookie (httpOnly),
  middleware route protection, lockout after 5 failed attempts, login-event audit trail,
  sign-out with server-side session revocation.
- 📊 **Dashboard**: live KPIs (cases, leads, A/R, trust balance), critical deadlines, my tasks.
- 🧲 **Leads & Quotes**: kanban by stage + fee-negotiation table (list $30,000, adjustments
  with reasons, PENDING_APPROVAL state for out-of-authority discounts).
- 👤 **Clients & Family**: client list with engagement-mode badges + client detail with the
  **Family Panel** (LICO auto-calc from family size, family govt-fees estimator with the
  biometrics family cap, per-member biometrics/medical/docs status), trust ledger.
- 🗂 **Cases**: list + rich case detail: 13-stage tracker, **Tracks A/B/C panels**
  (proposal state/sign-offs, corporation + 51% ownership check + partnership deal status,
  bank + party-tagged capital), Employer Portal panel, WP panel with 18-month countdown,
  13-folder repository summary, deadlines, timeline (stage logs), invoices.
- ⛔ **Server-enforced gates** (`/api/cases/[id]/advance`):
  - leaving Proposal Drafting → RCIC sign-off required
  - leaving Incorporation → client ≥51%, NBV ≤49%, partnership COI gate complete
  - leaving Employer Portal → **A-number + $230 compliance fee recorded** (verified: 422 without, 200 with)
  - leaving WP Prep → RCIC/Admin role only
- 💵 **Billing & Trust**: A/R, invoices, per-client trust balances summing to the control total.
- 🧾 **Expenses**: category budgets with burn bars, inbox status, ITC tracking.
- 👥 **Users & Access**: team table (roles, MFA flags, status), login events.
- 🛡 **Audit Log**: append-only activity feed.
- Seeded demo data mirrors the blueprint: Adeyemi (Mode A, family of 4, A-number gate active),
  Hosseini (Mode B 70:30, distributions, WP expiry countdown), Wang (Mode B 60:40, COI gate 2/4),
  five leads with quotes in every negotiation state.

## Sprint 1 additions (Lead → Quote → Agreed → Convert, all E2E-tested)

- **New Lead form** (`/leads` → "+ New Lead") with scorecard.
- **Lead detail page** (`/leads/[id]`): quote history, **quote builder** (list $30,000 −
  adjustments, each with a mandatory reason), quote actions (send / Owner-approve /
  **mark AGREED with acceptance evidence** / declined).
- **Discount authority enforced server-side**: CM = list only · RCIC ≤15% & ≥floor ·
  beyond → `PENDING_APPROVAL` (Admin-only approve endpoint).
- **Convert Lead → Client + Case** (`/api/leads/[id]/convert`) — the onboarding gate:
  - ⛔ blocked without an AGREED quote (verified: 422)
  - requires conflict-check ✓ + ID-verified ✓ + RCIC/Admin role
  - one transaction creates: client record · case file with **13 folders** ·
    **M1 invoice = 30% of agreed fee + GST** · trust deposit · **5-task onboarding bundle** ·
    stage log with quote evidence — all audit-logged.
- **Family member form** with auto-rules: dependent-eligibility (<22 warning verified for a
  23-year-old), biometrics 14–79/exempt, medical flags, LICO recalc.
- **Trust transaction entry** (RCIC/Admin only) with the **negative-balance block**
  (verified: $99,999 withdrawal vs $8,400 balance → 422).
- **Employer Portal form** on the case page: record offer / $230 fee / **A-number**
  (releases the WP gate).
- **Task add/complete** on case pages.

E2E test client "Carlos Rivera" (NBV-2026-0013) left in the demo DB as living proof of the flow.

## Sprint 1 — Document Repository (all 12 E2E tests passed)

- **Upload API** (`POST /api/cases/[id]/documents`, multipart): file-type allowlist
  (pdf/jpg/png/docx/xlsx/eml — .exe rejected ✓), 50 MB cap, **SHA-256 hash stored per file**,
  **enforced naming** `YYYY-MM-DD_<DocType>_<Party>_v<N>.<ext>`, **auto-versioning** (re-upload
  of same docType → v2, prior version marked superseded ✓), no folder → **Unfiled queue** ✓,
  closed-file repositories are read-only.
- **Status lifecycle API**: REQUESTED → RECEIVED → UNDER_REVIEW → APPROVED → SUBMITTED with
  invalid jumps blocked (RECEIVED→SUBMITTED rejected ✓); reviewer identity recorded;
  **LOCK** (RCIC/Admin only) makes a document immutable — uploads onto locked docs blocked ✓;
  **FILE** action moves triage-queue items into folders ✓.
- **Download API**: role-checked, audit-logged, attachment headers; **download hash verified
  identical to upload hash** ✓ (tamper evidence works end-to-end).
- **Folder-level role access** (src/lib/permissions.ts): Plan Writer limited to folders
  03/04/07 (upload to 06 → 403 ✓, download from 06 → 403 ✓, upload to 04 → allowed ✓);
  Accountant limited to 12.
- **Repository UI** (`/cases/[id]/documents`): folder tree with per-doc status pills, unfiled
  triage queue with file-to-folder control, expiring-≤90-days panel, upload form with doc-type
  catalogue (45 types), one-click status advance / approve / lock, download links.
- Storage: `uploads/` on local disk with UUID keys (path-traversal guarded) — swap
  `src/lib/storage.ts` for S3 ca-central-1 presigned flows in production without touching callers.

## Sprint 1 — Deadlines + Invoicing/Payments (9/9 E2E tests passed) — SPRINT 1 COMPLETE

- **Deadlines API + UI**: add deadlines per case with kinds (ADR / WP expiry / nomination /
  general); **ADR deadlines auto-create a HIGH-priority task at T-5 days internal cutoff** ✓;
  one-click "satisfied"; closed files read-only.
- **Invoice API + UI** (`POST /api/cases/[id]/invoices`):
  - **Milestone invoices auto-compute from the agreed fee** (M2 = 30% of $28,000 → $8,820
    incl. GST ✓) — fee amounts are never hand-typed;
  - **Double-billing block**: re-issuing M1 or M2 → 422 ✓;
  - custom invoices with FEE (+GST) vs DISBURSEMENT (no GST) line kinds;
  - plan writers cannot issue invoices (403).
- **Payments API + UI** (`POST /api/invoices/[id]/payments`):
  - **Overpayment guard** ($99,999 vs $8,820 remaining → 422 ✓);
  - partial payments → PARTIAL status, full → PAID ✓;
  - **"Pay from trust" = CICC earning event**: RCIC/Admin-only, checks trust balance,
    and writes the **paired TRANSFER_TO_OPERATING trust transaction automatically**
    (verified: $8,400 − $4,820 = $3,580 balance ✓, memo "Earned fees vs NBV-INV-2026-0055").

**Sprint 1 is complete** — staff can now run the entire core workflow from the UI:
lead → quote → agree → convert → family → documents → deadlines → tasks → invoices →
payments/trust, with every compliance gate enforced server-side and every action audit-logged.

## Sprint 2 — Compliance & Money Outputs (all E2E tests passed) — SPRINT 2 COMPLETE

- **Invoice/Receipt PDFs** (`GET /api/invoices/[id]/pdf`): NBV-branded, bill-to block,
  fee-vs-disbursement lines, GST broken out, payments listed, auto-titles as **RECEIPT**
  when paid in full ✓ (verified: $8,400 + $420 GST = $8,820, payments −$4,000/−$4,820,
  PAID IN FULL $0.00). PDF links on the Billing page. Plan writers blocked (403).
- **CICC Trust Reconciliation PDF** (`GET /api/reports/trust-reconciliation?month=&bank=`):
  per-client balances, system total vs entered bank-statement balance, **variance line
  (verified $0.00 — RECONCILED ✓)**, RCIC signature block. Admin/RCIC/Accountant only.
- **CRA Year-End CSV bundle** (`GET /api/reports/year-end?year=&part=`): summary (T2/GIFI
  prep), invoice register (fees/disb/GST split), payments register, **GST by quarter + ITC
  total**, expense register with GIFI codes, **unearned-trust liability list** (the
  "trust ≠ income" guard). Admin/Accountant only (Plan Writer → 403 ✓).
- **Deadline & Expiry Scanner** (`POST /api/jobs/scan`, manual button on Reports page or
  cron with `x-cron-key`): deadlines ≤14d → HIGH tasks · doc expiries ≤90d → tasks +
  auto-EXPIRED flagging · **WP expiry T-180 → extension-strategy task** (caught Hosseini's
  Oct 09 permit ✓) · overdue invoice marking · stale-case flags (14d no activity).
  **Idempotent — second run produced zero duplicates ✓.**
- New **📑 Reports & Compliance** page wires all four tools with role-aware UI.
- next.config: pdfkit marked as server-external (fixes font bundling).

## Sprint 3 — Security Hardening (17/17 E2E tests passed) — SPRINT 3 COMPLETE

- **TOTP MFA** (otplib v12): enrol on Users page (secret + otpauth URI → verify 6-digit
  code), wrong code rejected ✓; login becomes two-step (`mfaRequired` → code field appears);
  wrong login code rejected ✓, correct code signs in ✓; **mandatory for Admin/RCIC**
  (disable blocked for those roles); secrets stored AES-256-GCM encrypted.
- **User invite flow**: Admin-only (Case Manager → 403 ✓) → email link (single-use sha256-
  hashed token, 7-day expiry) → user sets own password — **policy enforced: 12+ chars,
  upper/lower/digit, common-password blocklist** (weak attempts rejected ✓) → token reuse
  blocked ✓ → new user signs in with own credentials ✓.
- **Password reset**: request endpoint with **no user enumeration** (identical response for
  unknown emails ✓); 1-hour single-use token; confirm **revokes all existing sessions** —
  old password rejected, new accepted ✓.
- **Field-level encryption** (AES-256-GCM, FIELD_KEY env): passport/UCI stored as
  `enc:v1:…` ciphertext (verified in raw DB ✓); default reads **masked** (····2345);
  full reveal RCIC/Admin-only (Case Manager → 403 ✓) and **audit-logged** as
  `viewed_sensitive` ✓.
- **Cron-key scanner auth**: `x-cron-key` header accepted ✓, wrong key 401 ✓ — ready for
  an external scheduler without a browser session.
- **Backups**: `scripts/backup.sh` — nightly tarball (SQLite+uploads) with 35-day retention,
  tested ✓; pg_dump + S3 (ca-central-1, KMS) variant included for production.
- New public pages: `/invite/[token]`, `/reset/[token]`; middleware allowlist updated.

## Going to production (checklist)

1. **Database**: switch `prisma/schema.prisma` provider to `postgresql`; host in Canada
   (AWS RDS ca-central-1 / Neon / Supabase Canada). Run `prisma migrate deploy`.
2. **Secrets**: set strong `AUTH_SECRET`; move to a secret manager.
3. **MFA**: add TOTP enrolment/verification (speakeasy or otplib) — schema flag already present.
4. **File storage**: S3-compatible bucket (Canada region) + presigned URLs for the document
   repository (DocumentItem.sha256 field ready).
5. **Field-level encryption** for passport/UCI numbers (AES-256-GCM via KMS).
6. **Background jobs**: nightly deadline/expiry scan (cron) → tasks + alerts.
7. **Backups**: automated daily snapshots, 35-day retention.
8. **Hosting**: Vercel (app) + Canadian DB/storage, or all-in on AWS ca-central-1.
9. Remaining Phase-1 build-out: quote→retainer conversion flow, invoice PDF generation,
   document upload UI, trust reconciliation report, CRA year-end export, user invite flow.
