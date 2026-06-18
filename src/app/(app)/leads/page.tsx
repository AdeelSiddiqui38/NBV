import Link from "next/link";
import { db } from "@/lib/db";
import { fmtCad, fmtDate } from "@/lib/constants";
import NewLeadForm from "@/components/NewLeadForm";

export const dynamic = "force-dynamic";

const STAGE_COLS: [string, string][] = [
  ["NEW", "New"],
  ["CONSULT_BOOKED", "Consultation"],
  ["FEASIBILITY_SENT", "Feasibility Sent"],
  ["QUOTE_SENT", "Quote / Negotiating"],
  ["FEE_AGREED", "Fee Agreed"],
  ["RETAINER_SENT", "Retainer Sent"],
];

export default async function LeadsPage() {
  const leads = await db.lead.findMany({
    where: { stage: { notIn: ["WON", "LOST"] } },
    include: { quotes: { include: { adjustments: true }, orderBy: { version: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  const quotes = await db.feeQuote.findMany({
    where: { status: { in: ["SENT", "NEGOTIATING", "PENDING_APPROVAL", "DRAFT"] } },
    include: { lead: true, adjustments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-navy">Leads — C11 Pre-Qualification & Fee Quotes</h1>
        <NewLeadForm />
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-800 mb-5">
        List price <b>CAD $30,000</b> · every adjustment needs a reason · RCIC authority ≤15% · below floor ($22,000) →
        Owner approval · <b>⛔ no onboarding without an AGREED quote</b>.
      </div>

      <div className="card mb-5 overflow-x-auto">
        <h3 className="text-sm font-bold text-navy mb-3">💬 Fee negotiations in progress</h3>
        <table className="w-full min-w-[720px]">
          <thead>
            <tr><th>Lead</th><th>Quote</th><th>List</th><th>Adjustments</th><th>Current offer</th><th>Status</th></tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const totalAdj = q.adjustments.reduce((s, a) => s + a.amount, 0);
              const offer = q.listPrice + totalAdj;
              return (
                <tr key={q.id}>
                  <td className="font-semibold"><Link className="underline" href={`/leads/${q.leadId}`}>{q.lead.name}</Link></td>
                  <td>{q.number} v{q.version}</td>
                  <td>{fmtCad(q.listPrice)}</td>
                  <td className="text-xs text-slate-500">
                    {q.adjustments.map((a) => `${fmtCad(a.amount)} (${a.reason})`).join("; ") || "none"}
                  </td>
                  <td className="font-bold">{fmtCad(offer)}</td>
                  <td>
                    <span className={`pill ${q.status === "PENDING_APPROVAL" ? "pill-red" : q.status === "NEGOTIATING" ? "pill-blue" : "pill-amber"}`}>
                      {q.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr><td colSpan={6} className="text-slate-400">No active negotiations.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-start">
        {STAGE_COLS.map(([key, label]) => (
          <div key={key} className="bg-slate-200/60 rounded-xl p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-1">
              {label} ({leads.filter((l) => l.stage === key).length})
            </div>
            {leads
              .filter((l) => l.stage === key)
              .map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`} className="block bg-white border border-slate-200 rounded-lg p-2.5 mb-2 text-xs hover:border-teal">
                  <div className="font-bold text-navy text-[13px]">{l.name}</div>
                  <div className="text-slate-500">{l.country} · {l.sector}</div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {l.scorecard && (
                      <span className={`pill ${l.scorecard === "GREEN" ? "pill-green" : l.scorecard === "AMBER" ? "pill-amber" : "pill-red"}`}>
                        {l.scorecard}
                      </span>
                    )}
                    {l.icaSigned && <span className="pill pill-teal">ICA ✓</span>}
                  </div>
                  <div className="text-slate-400 mt-1">{fmtDate(l.createdAt)}</div>
                </Link>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
