import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtCad, fmtDate, SETTLEMENT_FUNDS, GOVT_FEES } from "@/lib/constants";
import AddFamilyMember from "@/components/AddFamilyMember";
import TrustEntry from "@/components/TrustEntry";
import { ClientEditButton, PaymentSchedule } from "@/components/ClientEdit";

export const dynamic = "force-dynamic";

export default async function ClientDetail({ params }: { params: { id: string } }) {
  const client = await db.client.findUnique({
    where: { id: params.id },
    include: {
      familyMembers: { orderBy: { dateOfBirth: "asc" } },
      cases: true,
      trustTxns: { orderBy: { date: "desc" } },
      invoices: { include: { payments: true, lines: true }, orderBy: { issueDate: "asc" } },
      contactLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!client) notFound();

  const accompanying = client.familyMembers.filter((m) => m.accompanying);
  const familySize = 1 + accompanying.length;
  const lico = SETTLEMENT_FUNDS[Math.min(familySize, 7)] ?? 0;
  const trust = client.trustTxns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);

  const spouse = accompanying.find((m) => ["SPOUSE", "COMMON_LAW"].includes(m.relationship));
  const kids = accompanying.filter((m) => m.relationship === "CHILD");
  const age = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 86400000));
  const schoolKids = kids.filter((k) => age(k.dateOfBirth) >= 5);
  const bioCount = [client, ...accompanying].filter((m: any) => {
    const a = m.dateOfBirth ? age(m.dateOfBirth) : 40;
    return a >= 14 && a <= 79;
  }).length;
  const fees =
    GOVT_FEES.WORK_PERMIT +
    (spouse ? GOVT_FEES.WORK_PERMIT + GOVT_FEES.OPEN_PERMIT_HOLDER : 0) +
    schoolKids.length * GOVT_FEES.STUDY_PERMIT +
    Math.min(bioCount * GOVT_FEES.BIOMETRICS_INDIVIDUAL, GOVT_FEES.BIOMETRICS_FAMILY_CAP);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-xl font-bold text-navy">{client.firstName} {client.lastName}</h1>
        <span className="pill pill-gray">{client.clientNumber}</span>
        <span className="text-sm text-slate-500">{client.country}</span>
        {client.pipedaConsentAt && <span className="pill pill-green">PIPEDA consent ✓</span>}
        <span className={`pill ${client.status === "ACTIVE" ? "pill-green" : "pill-gray"}`}>{client.status}</span>
        <div className="ml-auto">
          <ClientEditButton client={{
            id: client.id, firstName: client.firstName, lastName: client.lastName,
            email: client.email, phone: client.phone, country: client.country,
            maritalStatus: client.maritalStatus, source: client.source,
            netWorthBand: client.netWorthBand, status: client.status,
          }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card"><div className="text-lg font-extrabold text-navy">{familySize}</div><div className="text-xs text-slate-500">Family size (accompanying)</div></div>
        <div className="card"><div className="text-lg font-extrabold text-navy">{fmtCad(lico)}</div><div className="text-xs text-slate-500">Required settlement funds (LICO)</div></div>
        <div className="card"><div className="text-lg font-extrabold text-navy">{fmtCad(fees)}</div><div className="text-xs text-slate-500">Family govt fees estimate</div></div>
        <div className="card"><div className="text-lg font-extrabold text-navy">{fmtCad(trust)}</div><div className="text-xs text-slate-500">Trust held by NBV</div></div>
      </div>

      {/* Client Details Card */}
      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-3">📋 Client Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div><span className="text-xs text-slate-500 block">Email</span>{client.email || "—"}</div>
          <div><span className="text-xs text-slate-500 block">Phone</span>{client.phone || "—"}</div>
          <div><span className="text-xs text-slate-500 block">Date of Birth</span>{fmtDate(client.dateOfBirth)}</div>
          <div><span className="text-xs text-slate-500 block">Marital Status</span>{client.maritalStatus || "—"}</div>
          <div><span className="text-xs text-slate-500 block">Source</span>{client.source || "—"}</div>
          <div><span className="text-xs text-slate-500 block">Net Worth Band</span>{client.netWorthBand || "—"}</div>
          <div><span className="text-xs text-slate-500 block">Passport Expiry</span>{fmtDate(client.passportExpiry)}</div>
          <div><span className="text-xs text-slate-500 block">PIPEDA Consent</span>{fmtDate(client.pipedaConsentAt)}</div>
        </div>
      </div>

      {/* Payment Schedule */}
      <PaymentSchedule
        clientId={client.id}
        invoices={client.invoices.map(inv => ({
          id: inv.id, number: inv.number, milestone: inv.milestone ?? "",
          status: inv.status, issueDate: inv.issueDate.toISOString(),
          dueDate: inv.dueDate?.toISOString() ?? null,
          total: inv.total, taxRate: inv.taxRate,
          lines: inv.lines.map(l => ({ id: l.id, kind: l.kind, description: l.description, amount: l.amount })),
          payments: inv.payments.map(p => ({
            id: p.id, date: p.date.toISOString(),
            amount: p.amount, method: p.method ?? "", reference: p.reference,
          })),
        }))}
      />

      {/* Family Panel */}
      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-3">👨‍👩‍👧 Family Panel</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b">
                <th className="pb-2 pr-3 text-left">Member</th><th className="pb-2 pr-3 text-left">Relationship</th>
                <th className="pb-2 pr-3 text-left">DOB</th><th className="pb-2 pr-3 text-left">Passport expiry</th>
                <th className="pb-2 pr-3 text-left">Passport</th>
                <th className="pb-2 pr-3 text-left">Biometrics</th><th className="pb-2 pr-3 text-left">Medical</th><th className="pb-2 text-left">Docs</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-3 font-bold">{client.firstName} {client.lastName}</td>
                <td className="py-2 pr-3"><span className="pill pill-blue">Principal</span></td>
                <td className="py-2 pr-3">{fmtDate(client.dateOfBirth)}</td>
                <td className="py-2 pr-3">{fmtDate(client.passportExpiry)}</td>
                <td className="py-2 pr-3">—</td>
                <td className="py-2 pr-3">—</td><td className="py-2 pr-3">—</td><td className="py-2">—</td>
              </tr>
              {client.familyMembers.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-semibold">{m.firstName} {m.lastName}</td>
                  <td className="py-2 pr-3">
                    {m.relationship}
                    {!m.accompanying && <span className="pill pill-gray ml-1">not accompanying</span>}
                  </td>
                  <td className="py-2 pr-3">{fmtDate(m.dateOfBirth)}</td>
                  <td className="py-2 pr-3">{fmtDate(m.passportExpiry)}</td>
                  <td className="py-2 pr-3">
                    {m.passportImageKey ? (
                      <a
                        href={`/api/clients/${client.id}/family/${m.id}/passport-file`}
                        target="_blank"
                        rel="noreferrer"
                        className={`pill ${m.passportVerified ? "pill-green" : "pill-gray"}`}
                      >
                        {m.passportVerified ? "✓ Verified" : "Manual review"}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3">{m.biometricsStatus ?? "—"}</td>
                  <td className="py-2 pr-3">{m.medicalStatus ?? "—"}</td>
                  <td className="py-2">{m.docsPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3"><AddFamilyMember clientId={client.id} /></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">Cases</h3>
          {client.cases.map((c) => (
            <div key={c.id} className="py-2 border-b border-slate-100 last:border-0 text-[13px]">
              <Link href={`/cases/${c.id}`} className="font-bold text-navy underline">{c.fileNumber}</Link>
              {" · "}{c.caseType.replace(/_/g, " ")} · <span className={`pill ${c.status === "OPEN" ? "pill-green" : "pill-gray"}`}>{c.status}</span>
            </div>
          ))}
          {client.cases.length === 0 && <p className="text-sm text-slate-400">No cases yet.</p>}
        </div>
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">Trust ledger (CICC client account)</h3>
          {client.trustTxns.map((t) => (
            <div key={t.id} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-[13px]">
              <span>{fmtDate(t.date)} · <span className="pill pill-teal">{t.type.replace(/_/g, " ")}</span> {t.memo}</span>
              <b>{t.type === "DEPOSIT" ? "+" : "−"}{fmtCad(t.amount)}</b>
            </div>
          ))}
          {client.trustTxns.length === 0 && <div className="text-sm text-slate-400">No trust activity.</div>}
          <div className="mt-3"><TrustEntry clientId={client.id} /></div>
        </div>
      </div>
    </div>
  );
}
