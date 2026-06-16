"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrustEntry({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(""); setBusy(true);
    const res = await fetch(`/api/clients/${clientId}/trust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: parseFloat(amount), memo, reference: reference || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setOpen(false); setAmount(""); setMemo(""); setReference("");
      router.refresh();
    } else setError(d.error ?? "Failed");
  }

  if (!open) return <button className="btn-ghost text-xs" onClick={() => setOpen(true)}>+ Trust transaction</button>;

  return (
    <div className="border border-slate-200 rounded-lg p-3 mt-2 text-xs bg-slate-50">
      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="DEPOSIT">Deposit (into trust)</option>
          <option value="TRANSFER_TO_OPERATING">Transfer to operating (earned)</option>
          <option value="DISBURSEMENT">Disbursement (paid for client)</option>
          <option value="REFUND">Refund to client</option>
        </select>
        <input className="input" type="number" placeholder="Amount CAD *" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" placeholder="Memo * (e.g., 'Earned vs INV-0051')" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <input className="input" placeholder="Reference (wire/e-transfer #)" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
      <div className="flex gap-2 mt-2">
        <button className="btn text-xs" disabled={busy} onClick={submit}>Record (RCIC approval)</button>
        <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">Balance can never go negative — enforced server-side. RCIC/Admin only.</div>
    </div>
  );
}
