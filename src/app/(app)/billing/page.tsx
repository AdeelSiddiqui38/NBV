import { db } from "@/lib/db";
import { fmtCad, fmtDate } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const [invoices, trustTxns, clients] = await Promise.all([
    db.invoice.findMany({ include: { client: true, payments: true }, orderBy: { issueDate: "desc" } }),
    db.trustTransaction.findMany({ include: { client: true }, orderBy: { date: "desc" } }),
    db.client.findMany({ include: { trustTxns: true } }),
  ]);

  const ar = invoices
    .filter((i) => ["SENT", "PARTIAL", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + i.total - i.payments.reduce((p, x) => p + x.amount, 0), 0);
  const collected = invoices.flatMap((i) => i.payments).reduce((s, p) => s + p.amount, 0);
  const trustTotal = trustTxns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);

  const perClientTrust = clients
    .map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      bal: c.trustTxns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0),
    }))
    .filter((x) => x.bal !== 0)
    .sort((a, b) => b.bal - a.bal);

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-5">Billing, Invoices & Trust Account</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card"><div className="text-xl font-extrabold text-navy">{fmtCad(ar)}</div><div className="text-xs text-slate-500">A/R outstanding</div></div>
        <div className="card"><div className="text-xl font-extrabold text-navy">{fmtCad(collected)}</div><div className="text-xs text-slate-500">Collected (lifetime)</div></div>
        <div className="card"><div className="text-xl font-extrabold text-navy">{fmtCad(trustTotal)}</div><div className="text-xs text-slate-500">Trust (client account)</div></div>
        <div className="card"><div className="text-xl font-extrabold text-navy">{invoices.filter((i) => i.status === "OVERDUE").length}</div><div className="text-xs text-slate-500">Overdue invoices</div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">Invoices</h3>
          <table className="w-full">
            <thead><tr><th>#</th><th>Client · milestone</th><th>Issued</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-bold">{inv.number}</td>
                  <td className="text-xs">{inv.client.firstName} {inv.client.lastName} · {inv.milestone ?? "—"}</td>
                  <td className="text-xs">{fmtDate(inv.issueDate)}</td>
                  <td className="font-semibold">{fmtCad(inv.total)}</td>
                  <td>
                    <span className={`pill ${inv.status === "PAID" ? "pill-green" : inv.status === "OVERDUE" ? "pill-red" : inv.status === "PARTIAL" ? "pill-amber" : "pill-blue"}`}>
                      {inv.status}
                    </span>{" "}
                    <a className="text-teal underline text-[10px] font-bold" href={`/api/invoices/${inv.id}/pdf`}>PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="card mb-4">
            <h3 className="text-sm font-bold text-navy mb-3">Trust — per-client balances (CICC)</h3>
            {perClientTrust.map((x) => (
              <div key={x.name} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-[13px]">
                <span>{x.name}</span><b>{fmtCad(x.bal)}</b>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-1 border-t-2 border-navy text-[13px]">
              <b>Total (must equal trust bank balance)</b><b>{fmtCad(trustTotal)}</b>
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm font-bold text-navy mb-3">Recent trust activity</h3>
            {trustTxns.slice(0, 8).map((t) => (
              <div key={t.id} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs">
                <span>{fmtDate(t.date)} · {t.client.firstName} {t.client.lastName} · <span className="pill pill-teal">{t.type.replace(/_/g, " ")}</span></span>
                <b>{t.type === "DEPOSIT" ? "+" : "−"}{fmtCad(t.amount)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
