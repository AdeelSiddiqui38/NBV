import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtCad } from "@/lib/constants";
import ReportTools from "@/components/ReportTools";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getSession();
  const trustTxns = await db.trustTransaction.findMany();
  const trustTotal = trustTxns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);
  const lastScan = await db.activityLog.findFirst({ where: { action: "nightly_scan" }, orderBy: { at: "desc" } });

  const canTrust = ["ADMIN", "RCIC", "ACCOUNTANT"].includes(user!.role);
  const canYearEnd = ["ADMIN", "ACCOUNTANT"].includes(user!.role);

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-5">Reports & Compliance Outputs</h1>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-2">🛡 CICC Trust Reconciliation (monthly)</h3>
          <p className="text-xs text-slate-500 mb-3">
            Per-client trust balances vs your trust bank statement. Current system total: <b>{fmtCad(trustTotal)}</b>.
            Generates the signed-off Detailed Client Account Reconciliation Statement PDF.
          </p>
          {canTrust ? <ReportTools kind="trust" /> : <div className="text-xs text-red-600">Admin/RCIC/Accountant role required.</div>}
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-2">🧾 CRA Year-End Package (CSV bundle)</h3>
          <p className="text-xs text-slate-500 mb-3">
            Invoice register · payments · GST/HST by quarter + ITCs · expense register (GIFI) ·
            unearned-trust liability · summary — hand the files to your accountant for the T2.
          </p>
          {canYearEnd ? <ReportTools kind="yearend" /> : <div className="text-xs text-red-600">Admin/Accountant role required.</div>}
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-2">🤖 Deadline & Expiry Scanner</h3>
          <p className="text-xs text-slate-500 mb-3">
            Scans: deadlines ≤14d → HIGH tasks · document expiries ≤90d → tasks · expired docs flagged ·
            WP expiry T-180 → strategy task · overdue invoices marked · stale cases (14d) flagged.
            Idempotent — safe to run anytime. In production runs nightly via cron.
          </p>
          <div className="text-[11px] text-slate-400 mb-2">
            Last run: {lastScan ? `${new Date(lastScan.at).toLocaleString("en-CA")} — ${lastScan.detail?.slice(0, 80)}` : "never"}
          </div>
          <ReportTools kind="scan" />
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-2">📄 Invoice PDFs</h3>
          <p className="text-xs text-slate-500">
            Every invoice now has a <b>PDF</b> link on the Billing page and case files — branded,
            GST broken out, payments shown, auto-converts to a receipt when paid in full.
          </p>
        </div>
      </div>
    </div>
  );
}
