import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { fmtCad, fmtDate } from "@/lib/constants";
import QuoteBuilder from "@/components/QuoteBuilder";
import QuoteActions from "@/components/QuoteActions";
import ConvertLead from "@/components/ConvertLead";

export const dynamic = "force-dynamic";

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: { quotes: { include: { adjustments: true }, orderBy: { version: "desc" } } },
  });
  if (!lead) notFound();

  const staff = await db.user.findMany({ where: { status: "ACTIVE", role: { in: ["ADMIN", "RCIC", "CASE_MANAGER"] } } });
  const agreed = lead.quotes.find((q) => q.status === "AGREED");

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h1 className="text-xl font-bold text-navy">{lead.name}</h1>
        <span className="pill pill-blue">{lead.stage.replace(/_/g, " ")}</span>
        {lead.scorecard && (
          <span className={`pill ${lead.scorecard === "GREEN" ? "pill-green" : lead.scorecard === "AMBER" ? "pill-amber" : "pill-red"}`}>
            Scorecard: {lead.scorecard}
          </span>
        )}
        {lead.icaSigned && <span className="pill pill-teal">ICA signed {lead.icaFee ? `· ${fmtCad(lead.icaFee)}` : ""}</span>}
      </div>
      <div className="text-sm text-slate-500 mb-5">
        {lead.country} · {lead.sector} {lead.province && `· ${lead.province}`} · Source: {lead.source ?? "—"}
        {lead.scorecardNote && <> · <i>{lead.scorecardNote}</i></>}
      </div>

      {lead.stage === "WON" && lead.clientId ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 mb-5">
          ✅ Converted to client.{" "}
          <Link href={`/clients/${lead.clientId}`} className="underline font-bold">Open client file →</Link>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <div className="card mb-4">
            <h3 className="text-sm font-bold text-navy mb-3">Quote history (list $30,000)</h3>
            {lead.quotes.length === 0 && <div className="text-sm text-slate-400">No quotes yet — build one →</div>}
            {lead.quotes.map((q) => {
              const offer = q.listPrice + q.adjustments.reduce((s, a) => s + a.amount, 0);
              return (
                <div key={q.id} className="py-2.5 border-b border-slate-100 last:border-0 text-[13px]">
                  <div className="flex justify-between items-center">
                    <span>
                      <b>{q.number}</b> v{q.version} · <b>{fmtCad(offer)}</b>{" "}
                      <span className={`pill ${q.status === "AGREED" ? "pill-green" : q.status === "PENDING_APPROVAL" ? "pill-red" : q.status === "DECLINED" || q.status === "EXPIRED" ? "pill-gray" : "pill-blue"}`}>
                        {q.status.replace(/_/g, " ")}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(q.createdAt)}</span>
                  </div>
                  {q.adjustments.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {q.adjustments.map((a) => `${fmtCad(a.amount)} — ${a.reason}`).join(" · ")}
                    </div>
                  )}
                  {q.status === "AGREED" && (
                    <div className="text-xs text-emerald-700 mt-1">Agreed {fmtDate(q.agreedAt)} · evidence: {q.acceptanceRef}</div>
                  )}
                  <QuoteActions quoteId={q.id} status={q.status} />
                </div>
              );
            })}
          </div>
          {lead.stage !== "WON" && <QuoteBuilder leadId={lead.id} />}
        </div>

        <div>
          {lead.stage !== "WON" && (
            <div className="card">
              <h3 className="text-sm font-bold text-navy mb-1">Convert to Client + Open Case File</h3>
              {agreed ? (
                <div className="text-xs text-emerald-700 mb-3">
                  ✅ Gate satisfied: {agreed.number} AGREED at <b>{fmtCad(agreed.agreedFee)}</b>. The agreed fee will
                  auto-populate the retainer milestones and first invoice.
                </div>
              ) : (
                <div className="text-xs text-red-600 font-semibold mb-3">
                  ⛔ Onboarding gate: no AGREED quote yet. Negotiate and mark a quote AGREED first — conversion is blocked server-side.
                </div>
              )}
              <ConvertLead
                leadId={lead.id}
                leadName={lead.name}
                staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
                gateOpen={!!agreed}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
