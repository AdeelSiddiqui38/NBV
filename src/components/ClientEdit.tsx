"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string; firstName: string; lastName: string; email?: string | null;
  phone?: string | null; country?: string | null; maritalStatus?: string | null;
  source?: string | null; netWorthBand?: string | null; status?: string | null;
  dateOfBirth?: string | null; passportExpiry?: string | null;
};

type Invoice = {
  id: string; number: string; milestone: string; status: string;
  issueDate: string; dueDate?: string | null; total: number;
  payments: { id: string; date: string; amount: number; method: string; reference?: string | null }[];
};

// ── Client Edit ──────────────────────────────────────────────────────────────
export function ClientEditButton({ client }: { client: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    firstName: client.firstName, lastName: client.lastName,
    email: client.email || "", phone: client.phone || "",
    country: client.country || "", maritalStatus: client.maritalStatus || "",
    source: client.source || "", netWorthBand: client.netWorthBand || "",
    status: client.status || "ACTIVE",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true); setError("");
    const r = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setOpen(false); router.refresh(); }
    else setError(d.error ?? "Save failed");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn text-xs px-3 py-1.5">✏️ Edit Client</button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">Edit Client — {client.firstName} {client.lastName}</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["firstName","First Name"], ["lastName","Last Name"],
                ["email","Email"], ["phone","Phone"],
                ["country","Country"], ["maritalStatus","Marital Status"],
                ["source","Source / Referral"], ["netWorthBand","Net Worth Band"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input className="w-full border rounded px-2 py-1.5 text-sm"
                    value={(f as Record<string,string>)[k]}
                    onChange={e => setF(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={f.status}
                  onChange={e => setF(p => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-sm bg-navy text-white rounded font-semibold disabled:opacity-50">
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Payment Schedule ──────────────────────────────────────────────────────────
export function PaymentSchedule({ invoices, clientId }: { invoices: Invoice[]; clientId: string }) {
  const router = useRouter();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [pay, setPay] = useState({ amount: "", method: "e-transfer", reference: "", date: new Date().toISOString().split("T")[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fmtCad = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

  const statusColor: Record<string, string> = {
    PAID: "pill-green", OVERDUE: "pill-red", SENT: "pill-blue",
    DRAFT: "pill-gray", PARTIAL: "pill-amber",
  };

  const addPayment = async (invoiceId: string) => {
    setBusy(true); setError("");
    const r = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(pay.amount), method: pay.method, reference: pay.reference, date: pay.date }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setAddingTo(null); setPay({ amount: "", method: "e-transfer", reference: "", date: new Date().toISOString().split("T")[0] }); router.refresh(); }
    else setError(d.error ?? "Failed");
  };

  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.payments.reduce((p, r) => p + r.amount, 0), 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div className="card mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-navy">💳 Payment Schedule & Invoices</h3>
        <div className="text-xs text-slate-500">
          Billed: <b>{fmtCad(totalBilled)}</b> · Paid: <b className="text-green-700">{fmtCad(totalPaid)}</b> · Outstanding: <b className={outstanding > 0 ? "text-red-600" : "text-green-700"}>{fmtCad(outstanding)}</b>
        </div>
      </div>

      {invoices.length === 0 && <p className="text-sm text-slate-400">No invoices yet.</p>}

      {invoices.map((inv) => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        const balance = inv.total - paid;
        return (
          <div key={inv.id} className="border border-slate-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <span className="font-bold text-navy text-sm">{inv.number}</span>
                <span className="text-xs text-slate-500 ml-2">{inv.milestone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`pill ${statusColor[inv.status] ?? "pill-gray"}`}>{inv.status}</span>
                <span className="text-sm font-bold">{fmtCad(inv.total)}</span>
              </div>
            </div>

            {inv.dueDate && (
              <div className="text-xs text-slate-500 mb-2">Due: {new Date(inv.dueDate).toLocaleDateString("en-CA")}</div>
            )}

            {inv.payments.length > 0 && (
              <div className="bg-slate-50 rounded p-2 mb-2">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Payments received:</div>
                {inv.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs py-0.5">
                    <span>{new Date(p.date).toLocaleDateString("en-CA")} · {p.method} {p.reference && `(${p.reference})`}</span>
                    <span className="font-semibold text-green-700">+{fmtCad(p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200 mt-1 font-bold">
                  <span>Balance remaining</span>
                  <span className={balance > 0 ? "text-red-600" : "text-green-700"}>{fmtCad(balance)}</span>
                </div>
              </div>
            )}

            {balance > 0 && (
              <>
                {addingTo === inv.id ? (
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-xs font-semibold text-navy mb-2">Record payment</div>
                    {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[11px] text-slate-500">Amount (CAD)</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" type="number" placeholder={String(balance)}
                          value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Date</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" type="date"
                          value={pay.date} onChange={e => setPay(p => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Method</label>
                        <select className="w-full border rounded px-2 py-1 text-sm" value={pay.method}
                          onChange={e => setPay(p => ({ ...p, method: e.target.value }))}>
                          <option value="e-transfer">e-Transfer</option>
                          <option value="wire">Wire</option>
                          <option value="cheque">Cheque</option>
                          <option value="cash">Cash</option>
                          <option value="credit_card">Credit Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500">Reference #</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Optional"
                          value={pay.reference} onChange={e => setPay(p => ({ ...p, reference: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addPayment(inv.id)} disabled={busy || !pay.amount}
                        className="px-3 py-1 text-xs bg-navy text-white rounded font-semibold disabled:opacity-50">
                        {busy ? "Saving…" : "Record Payment"}
                      </button>
                      <button onClick={() => setAddingTo(null)} className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingTo(inv.id); setError(""); }}
                    className="text-xs text-blue-600 hover:underline font-semibold">
                    + Record payment
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
