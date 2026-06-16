"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Adj = { type: string; amount: number; reason: string };
const ADJ_TYPES = [
  ["MARKET_ADJ", "Market adjustment"],
  ["PCT_DISCOUNT", "Discount"],
  ["FIXED_REDUCTION", "Fixed reduction"],
  ["SCOPE_REMOVED", "Scope removed"],
  ["EQUITY_CONSIDERATION", "Equity consideration (partnership)"],
];

export default function QuoteBuilder({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [adjs, setAdjs] = useState<Adj[]>([]);
  const [type, setType] = useState("MARKET_ADJ");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const LIST = 30000;
  const offer = LIST + adjs.reduce((s, a) => s + a.amount, 0);

  function addAdj() {
    const amt = -Math.abs(parseFloat(amount));
    if (!amt || !reason.trim()) { setError("Amount and reason are both required."); return; }
    setAdjs([...adjs, { type, amount: amt, reason: reason.trim() }]);
    setAmount(""); setReason(""); setError("");
  }

  async function submit(send: boolean) {
    setError(""); setMsg(""); setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adjustments: adjs, send }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg(d.requiresApproval ? "⚠ Quote exceeds your discount authority — routed to Owner approval." : "Quote created.");
      setAdjs([]);
      router.refresh();
    } else setError(d.error ?? "Failed");
  }

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-navy mb-3">New quote version</h3>
      <div className="flex justify-between text-sm mb-3">
        <span>List price</span><b>${LIST.toLocaleString()}</b>
      </div>
      {adjs.map((a, i) => (
        <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-100">
          <span>{a.type.replace(/_/g, " ")} — {a.reason}</span>
          <span className="text-red-600 font-semibold">−${Math.abs(a.amount).toLocaleString()}
            <button className="ml-2 text-slate-400" onClick={() => setAdjs(adjs.filter((_, j) => j !== i))}>✕</button>
          </span>
        </div>
      ))}
      <div className="flex justify-between text-sm py-2 border-t-2 border-navy mt-1 mb-3">
        <b>Offer</b><b className={offer < 22000 ? "text-red-600" : ""}>${offer.toLocaleString()}{offer < 22000 && " (below floor!)"}</b>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {ADJ_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button className="btn-ghost text-xs mb-3" onClick={addAdj}>+ Add adjustment</button>
      {error && <div className="text-red-600 text-xs font-semibold mb-2">{error}</div>}
      {msg && <div className="text-emerald-700 text-xs font-semibold mb-2">{msg}</div>}
      <div className="flex gap-2">
        <button className="btn" disabled={loading} onClick={() => submit(true)}>Create & mark Sent</button>
        <button className="btn-ghost" disabled={loading} onClick={() => submit(false)}>Save as draft</button>
      </div>
      <div className="text-[10px] text-slate-400 mt-2">
        Authority: CM = list only · RCIC ≤15% · below $22,000 floor → Owner approval (enforced server-side).
      </div>
    </div>
  );
}
