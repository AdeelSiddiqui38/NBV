import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { C11_STAGES, STAGE_LABELS, ENGAGEMENT_MODES, fmtCad, fmtDate, daysUntil } from "@/lib/constants";
import AdvanceStage from "@/components/AdvanceStage";
import PortalForm from "@/components/PortalForm";
import { CompleteTask, NewTask } from "@/components/TaskActions";
import { NewDeadline, SatisfyDeadline } from "@/components/DeadlineWidget";
import { NewInvoice, RecordPayment } from "@/components/InvoiceWidget";

export const dynamic = "force-dynamic";

export default async function CaseDetail({ params }: { params: { id: string } }) {
  const c = await db.case.findUnique({
    where: { id: params.id },
    include: {
      client: { include: { familyMembers: true } },
      rcic: true,
      caseManager: true,
      proposal: { include: { plannedHires: true } },
      corp: { include: { shareholders: true, bankAccounts: { include: { capitalTxns: true } }, deal: true } },
      portal: true,
      workPermit: true,
      folders: { include: { documents: true }, orderBy: { code: "asc" } },
      documents: true,
      deadlines: { orderBy: { dueDate: "asc" } },
      stageLogs: { orderBy: { at: "desc" }, take: 15 },
      invoices: { include: { payments: true } },
      tasks: { where: { status: "OPEN" } },
    },
  });
  if (!c) notFound();

  const staffUsers = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } });
  const staff = staffUsers.map((s) => ({ id: s.id, name: s.name }));

  const stageIdx = C11_STAGES.indexOf(c.currentStage as any);
  const clientPct = c.corp?.shareholders.filter((s) => s.party === "CLIENT").reduce((s, x) => s + x.pct, 0) ?? null;
  const capitalTotal = c.corp?.bankAccounts.flatMap((b) => b.capitalTxns).filter((t) => t.party === "CLIENT").reduce((s, t) => s + t.amountCad, 0) ?? 0;
  const aNumberMissing = !c.portal?.aNumber;
  const accompanying = c.client.familyMembers.filter((m) => m.accompanying);

  // Gate evaluation for advancing
  const gates: string[] = [];
  if (c.currentStage === "EMPLOYER_PORTAL" && aNumberMissing) gates.push("A-number not recorded — WP cannot be filed (hard gate).");
  if (c.currentStage === "PROPOSAL_DRAFTING" && c.proposal && !c.proposal.rcicSignedOffAt) gates.push("RCIC sign-off required on proposal before client review.");
  if (c.currentStage === "INCORPORATION" && clientPct !== null && clientPct < 51) gates.push(`Client ownership ${clientPct}% < 51% — C11 validator block.`);
  if (c.corp?.deal && c.corp.deal.status !== "SHARES_ISSUED" && c.corp.deal.status !== "ACTIVE") {
    const d = c.corp.deal;
    const missing = [
      !d.coiDisclosure && "COI disclosure",
      d.ilaStatus !== "CONFIRMED" && d.ilaStatus !== "WAIVED" && "ILA confirmation",
      !d.clientConsent && "client consent",
      !d.retainerAddendum && "retainer addendum",
    ].filter(Boolean);
    if (missing.length) gates.push(`Partnership COI gate incomplete: ${missing.join(", ")}.`);
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <h1 className="text-lg font-bold text-navy">{c.fileNumber} · {c.client.firstName} {c.client.lastName}</h1>
        <span className="pill pill-blue">{c.caseType.replace(/_/g, " ")}</span>
        <span className="pill pill-amber">{STAGE_LABELS[c.currentStage]}</span>
        <span className="text-xs text-slate-500 ml-auto">
          RCIC: {c.rcic.name} {c.caseManager && `· CM: ${c.caseManager.name}`} · Opened {fmtDate(c.openedAt)}
        </span>
      </div>
      <div className="text-xs text-slate-500 mb-4">
        Engagement: <b>{ENGAGEMENT_MODES[c.engagementMode as keyof typeof ENGAGEMENT_MODES] ?? c.engagementMode}</b>
        {c.agreedFee && <> · Agreed fee: <b>{fmtCad(c.agreedFee)}</b></>}
      </div>

      {/* stage tracker */}
      <div className="card mb-4 overflow-x-auto">
        <div className="flex min-w-[900px]">
          {C11_STAGES.map((s, i) => (
            <div key={s} className="flex-1 text-center relative pt-5">
              <div
                className={`w-3.5 h-3.5 rounded-full mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-10 ${
                  i < stageIdx ? "bg-teal" : i === stageIdx ? "bg-navy ring-4 ring-slate-300" : "bg-slate-300"
                }`}
              />
              {i < C11_STAGES.length - 1 && (
                <div className={`absolute top-1.5 left-1/2 right-[-50%] h-0.5 ${i < stageIdx ? "bg-teal" : "bg-slate-300"}`} />
              )}
              <div className={`text-[9.5px] font-semibold mt-1 ${i === stageIdx ? "text-navy font-extrabold" : i < stageIdx ? "text-teal" : "text-slate-400"}`}>
                {STAGE_LABELS[s]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* gates */}
      {gates.map((g, i) => (
        <div key={i} className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-[13px] mb-3">
          ⛔ <b>Gate:</b> {g}
        </div>
      ))}

      {/* family strip */}
      {accompanying.length > 0 && (
        <div className="card mb-4 py-3">
          <div className="flex gap-4 flex-wrap items-center text-xs">
            <b className="text-navy">👨‍👩‍👧 Family ({1 + accompanying.length} accompanying)</b>
            {accompanying.map((m) => (
              <span key={m.id}>
                <b>{m.firstName}</b> ({m.relationship.toLowerCase()}) · docs {m.docsPct}%
                {m.biometricsStatus === "EXEMPT" && <span className="pill pill-gray ml-1">bio exempt</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* three tracks */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="card bg-slate-50">
          <h4 className="text-xs font-bold text-navy mb-2">📈 Track A — Business Proposal</h4>
          {c.proposal ? (
            <div className="text-xs space-y-1">
              <div>State: <span className="pill pill-blue">{c.proposal.state.replace(/_/g, " ")}</span> · {c.proposal.currentVersion}</div>
              <div>Writer: {c.proposal.writerName ?? "—"}</div>
              <div>RCIC sign-off: {c.proposal.rcicSignedOffAt ? `✅ ${fmtDate(c.proposal.rcicSignedOffAt)}` : "⏳ pending"}</div>
              <div>Client approved: {c.proposal.clientApprovedAt ? `✅ ${fmtDate(c.proposal.clientApprovedAt)}` : "⏳"}</div>
              <div>Job plan: {c.proposal.plannedHires.length} hires · {fmtCad(c.proposal.plannedHires.reduce((s, h) => s + h.salary, 0))} payroll</div>
              {c.proposal.finalSha256 && <div className="pill pill-green">FINAL locked 🔒</div>}
            </div>
          ) : <div className="text-xs text-slate-400">Not started.</div>}
        </div>
        <div className="card bg-slate-50">
          <h4 className="text-xs font-bold text-navy mb-2">🏢 Track B — Incorporation</h4>
          {c.corp ? (
            <div className="text-xs space-y-1">
              <div className="font-semibold">{c.corp.legalName ?? "(name pending)"}</div>
              <div>Stage: <span className="pill pill-blue">{c.corp.stage.replace(/_/g, " ")}</span> · {c.corp.jurisdiction}</div>
              {c.corp.certificateNo && <div>Cert #{c.corp.certificateNo} · {fmtDate(c.corp.incorporatedAt)}</div>}
              {c.corp.businessNumber && <div>BN {c.corp.businessNumber} · {c.corp.craAccounts}</div>}
              <div>
                Ownership:{" "}
                {clientPct !== null && (
                  <span className={`pill ${clientPct >= 51 ? "pill-green" : "pill-red"}`}>
                    Client {clientPct}% {clientPct >= 51 ? "✓" : "⛔ <51%"}
                  </span>
                )}
              </div>
              {c.corp.deal && (
                <div>
                  Deal: <span className="pill pill-purple">
                    {c.corp.deal.clientPct}:{c.corp.deal.nbvPct} · {c.corp.deal.financialInvolvement ? "Mode B" : "Mode C (sweat)"}
                  </span>{" "}
                  <span className="pill pill-gray">{c.corp.deal.status.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>
          ) : <div className="text-xs text-slate-400">Not started.</div>}
        </div>
        <div className="card bg-slate-50">
          <h4 className="text-xs font-bold text-navy mb-2">🏦 Track C — Bank & Capital</h4>
          {c.corp?.bankAccounts.length ? (
            c.corp.bankAccounts.map((b) => (
              <div key={b.id} className="text-xs space-y-1">
                <div className="font-semibold">{b.bankName} {b.maskedNo && `···${b.maskedNo}`}</div>
                <div>Status: <span className="pill pill-blue">{b.status.replace(/_/g, " ")}</span></div>
                <div>Client business capital in: <b>{fmtCad(capitalTotal)}</b></div>
                {b.capitalTxns.some((t) => t.party === "NBV") && (
                  <div>NBV capital: <b>{fmtCad(b.capitalTxns.filter((t) => t.party === "NBV").reduce((s, t) => s + t.amountCad, 0))}</b> <span className="pill pill-purple">party-tagged</span></div>
                )}
              </div>
            ))
          ) : <div className="text-xs text-slate-400">Not started.</div>}
        </div>
      </div>

      {/* employer portal + WP */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">🛂 Employer Portal & Offer</h4>
          {c.portal ? (
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="text-slate-500">Job / NOC / TEER</td><td>{c.portal.jobTitle} · NOC {c.portal.noc} · TEER {c.portal.teer}
                  {c.portal.teer !== null && c.portal.teer <= 1 && <span className="pill pill-teal ml-1">Spouse OWP ✓</span>}
                </td></tr>
                <tr><td className="text-slate-500">Offer submitted</td><td>{fmtDate(c.portal.offerSubmittedAt)}</td></tr>
                <tr><td className="text-slate-500">Compliance fee $230</td><td>{c.portal.complianceFeePaidAt ? `✅ ${fmtDate(c.portal.complianceFeePaidAt)}` : "⏳"}</td></tr>
                <tr><td className="text-slate-500">A-number</td><td>{c.portal.aNumber ? <b>{c.portal.aNumber} ✅</b> : <span className="pill pill-amber">Awaiting — gate active</span>}</td></tr>
              </tbody>
            </table>
          ) : <div className="text-xs text-slate-400">Not started.</div>}
          <PortalForm caseId={c.id} hasANumber={!!c.portal?.aNumber} />
        </div>
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">📋 Work Permit</h4>
          {c.workPermit ? (
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="text-slate-500">Submitted</td><td>{fmtDate(c.workPermit.submittedAt)} {c.workPermit.applicationNo && `· ${c.workPermit.applicationNo}`}</td></tr>
                <tr><td className="text-slate-500">Decision</td><td>{c.workPermit.decision ?? "pending"}</td></tr>
                {c.workPermit.permitEnd && (
                  <tr><td className="text-slate-500">Permit validity</td><td>
                    {fmtDate(c.workPermit.permitStart)} → <b>{fmtDate(c.workPermit.permitEnd)}</b>{" "}
                    {(() => { const d = daysUntil(c.workPermit!.permitEnd); return d !== null && d < 180 ? <span className="pill pill-red">T-{d}d — extension window</span> : null; })()}
                  </td></tr>
                )}
              </tbody>
            </table>
          ) : <div className="text-xs text-slate-400">Not filed yet.</div>}
        </div>
      </div>

      {/* repository + deadlines + timeline */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">
            🗄 Repository ({c.documents.length} docs) ·{" "}
            <Link href={`/cases/${c.id}/documents`} className="text-teal underline font-normal">open / upload →</Link>
          </h4>
          {c.folders.map((f) => (
            <div key={f.id} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
              <span>{f.code} {f.name}</span>
              <span className="text-slate-500">{f.documents.length}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">⏰ Deadlines</h4>
          {c.deadlines.map((d) => {
            const days = daysUntil(d.dueDate);
            return (
              <div key={d.id} className="text-xs py-1.5 border-b border-slate-100 last:border-0 flex justify-between gap-2">
                <span className={d.satisfied ? "line-through text-slate-400" : days !== null && days <= 14 ? "text-red-600 font-bold" : ""}>
                  {d.label} — {fmtDate(d.dueDate)} {!d.satisfied && days !== null && `(${days}d)`}
                  {d.kind !== "GENERAL" && <span className="pill pill-gray ml-1">{d.kind.replace(/_/g, " ")}</span>}
                </span>
                {!d.satisfied && <SatisfyDeadline deadlineId={d.id} />}
              </div>
            );
          })}
          {c.deadlines.length === 0 && <div className="text-xs text-slate-400">None.</div>}
          <NewDeadline caseId={c.id} />
          <h4 className="text-xs font-bold text-navy mt-3 mb-1">Open tasks</h4>
          {c.tasks.map((t) => (
            <div key={t.id} className="text-xs py-1 flex justify-between gap-2">
              <span>• {t.title}</span>
              <CompleteTask taskId={t.id} />
            </div>
          ))}
          <div className="mt-2">
            <NewTask caseId={c.id} staff={staff} />
          </div>
        </div>
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">📜 Timeline (paper trail)</h4>
          <div className="border-l-2 border-slate-200 ml-1 pl-3 space-y-2">
            {c.stageLogs.map((l) => (
              <div key={l.id} className="text-xs relative">
                <span className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-teal" />
                <b>{l.fromStage ? `${STAGE_LABELS[l.fromStage] ?? l.fromStage} → ` : ""}{STAGE_LABELS[l.toStage] ?? l.toStage}</b>
                {l.note && <div className="text-slate-500">{l.note}</div>}
                <div className="text-slate-400">{fmtDate(l.at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* financials + advance */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">💵 Invoices</h4>
          {c.invoices.map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = Math.round((inv.total - paid) * 100) / 100;
            return (
              <div key={inv.id} className="text-xs py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex justify-between">
                  <span>{inv.number} · {inv.milestone ?? ""} · {fmtDate(inv.issueDate)}</span>
                  <span>
                    <b>{fmtCad(inv.total)}</b>{" "}
                    <span className={`pill ${inv.status === "PAID" ? "pill-green" : inv.status === "OVERDUE" ? "pill-red" : "pill-amber"}`}>
                      {inv.status}{paid > 0 && paid < inv.total ? ` (${fmtCad(paid)})` : ""}
                    </span>
                  </span>
                </div>
                {inv.status !== "PAID" && inv.status !== "VOID" && <RecordPayment invoiceId={inv.id} remaining={remaining} />}
              </div>
            );
          })}
          {c.invoices.length === 0 && <div className="text-xs text-slate-400">No invoices.</div>}
          <NewInvoice caseId={c.id} hasAgreedFee={!!c.agreedFee} />
        </div>
        <div className="card">
          <h4 className="text-xs font-bold text-navy mb-2">▶ Advance stage</h4>
          <AdvanceStage caseId={c.id} currentStage={c.currentStage} blocked={gates.length > 0} />
        </div>
      </div>
    </div>
  );
}
