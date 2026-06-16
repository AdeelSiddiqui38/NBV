import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtCad, fmtDate, SETTLEMENT_FUNDS, GOVT_FEES } from "@/lib/constants";
import AddFamilyMember from "@/components/AddFamilyMember";
import TrustEntry from "@/components/TrustEntry";

export const dynamic = "force-dynamic";

export default async function ClientDetail({ params }: { params: { id: string } }) {
  const client = await db.client.findUnique({
    where: { id: params.id },
    include: {
      familyMembers: { orderBy: { dateOfBirth: "asc" } },
      cases: true,
      trustTxns: { orderBy: { date: "desc" } },
      invoices: { include: { payments: true } },
      contactLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!client) notFound();

  const accompanying = client.familyMembers.filter((m) => m.accompanying);
  const familySize = 1 + accompanying.length;
  const lico = SETTLEMENT_FUNDS[Math.min(familySize, 7)] ?? 0;
  const trust = client.trustTxns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);

  // family fees estimate
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
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-xl font-bold text-navy">
          {client.firstName} {client.lastName}
        </h1>
        <span className="pill pill-gray">{client.clientNumber}</span>
        <span className="text-sm text-slate-500">{client.country}</span>
        {client.pipedaConsentAt && <span className="pill pill-green">PIPEDA consent ✓</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card"><div className="text-lg font-extrabold text-navy">{familySize}</div><div className="text-xs text-slate-500">Family size (accompanying)</div></div>
        <div className="card"><div className="text-lg font-extrabold text-navy">{fmtCad(lico)}</div><div className="text-xs text-slate-500">Required settlement funds (LICO)</div></div>
        <div className="card"><div className="text-lg font-extrabold text-navy">{fmtCad(fees)}</div><div className="text-xs text-slate-500">Family govt fees estimate</div></div>
        <div className="card"><div className="text-lg font-extrabold text-navy">{fmtCad(trust)}</div><div className="text-xs text-slate-500">Trust held by NBV</div></div>
      </div>

      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-3">👨‍👩‍👧 Family Panel</h3>
        <table className="w-full">
          <thead>
            <tr><th>Member</th><th>Relationship</th><th>DOB</th><th>Passport expiry</th><th>Application</th><th>Biometrics</th><th>Medical</th><th>Docs</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">{client.firstName} {client.lastName}</td>
              <td>Principal</td>
              <td>{fmtDate(client.dateOfBirth)}</td>
              <td>{fmtDate(client.passportExpiry)}</td>
              <td><span className="pill pill-blue">C11 WP</span></td>
              <td>—</td><td>—</td><td>—</td>
            </tr>
            {client.familyMembers.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold">{m.firstName} {m.lastName}</td>
                <td>
                  {m.relationship}
                  {!m.accompanying && <span className="pill pill-gray ml-1">not accompanying</span>}
                </td>
                <td>{fmtDate(m.dateOfBirth)}</td>
                <td>{fmtDate(m.passportExpiry)}</td>
                <td>{m.companionCaseId ? <span className="pill pill-teal">Companion case</span> : <span className="text-slate-400">—</span>}</td>
                <td>{m.biometricsStatus ?? "—"}</td>
                <td>{m.medicalStatus ?? "—"}</td>
                <td>{m.docsPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3">
          <AddFamilyMember clientId={client.id} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">Cases</h3>
          {client.cases.map((c) => (
            <div key={c.id} className="py-2 border-b border-slate-100 last:border-0 text-[13px]">
              <Link href={`/cases/${c.id}`} className="font-bold text-navy underline">{c.fileNumber}</Link>{" "}
              · {c.caseType.replace(/_/g, " ")} ·{" "}
              <span className={`pill ${c.status === "OPEN" ? "pill-green" : "pill-gray"}`}>{c.status}</span>
            </div>
          ))}
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
          <div className="mt-3">
            <TrustEntry clientId={client.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
