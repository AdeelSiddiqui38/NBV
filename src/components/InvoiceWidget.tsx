"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MILESTONES = [
  "M1 — Retainer / file opening (30%)",
  "M2 — Business plan approved (30%)",
  "M3 — Incorporation + bank complete (25%)",
  "M4 — WP submitted (15%)",
];

export function NewInvoice({ caseId, hasAgreedFee }: { caseId: string; hasAgreedFee: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"milestone" | "custom">("milestone");
  const [milestoneIndex, setMilestoneIndex] = useState(1);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("FEE");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="btn-ghost text-xs py-1 mt-2" onClick={() => setOpen(true)}>+ Invoice</button>;

  async function submit() {
    setError(""); setBusy(true);
    const payload =
      mode === "milestone"
        ? { milestoneIndex }
        : { lines: [{ kind, description: desc, amount: parseFloat(amount) }] };
    const res = await fetch(`/api/cases/${caseId}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError(d.error ?? "Failed");
  }

  return (
    <div className="mt-2 text-xs space-y-1 border border-slate-200 rounded-lg p-2 bg-slate-50">
      <div className="flex gap-2">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "milestone"} onChange={() => setMode("milestone")} disabled={!hasAgreedFee} />
          Milestone (auto-amount from agreed fee)
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "custom"} onChange={() => setMode("custom")} />
          Custom / disbursement
        </label>
      </div>
      {mode === "milestone" ? (
        <select className="input text-xs py-1" value={milestoneIndex} onChange={(e) => setMilestoneIndex(parseInt(e.target.value))}>
          {MILESTONES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      ) : (
        <div className="flex gap-1">
          <select className="input text-xs py-1 w-32" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="FEE">Fee (+GST)</option>
            <option value="DISBURSEMENT">Disbursement (no GST)</option>
          </select>
          <input className="input text-xs py-1" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className="input text-xs py-1 w-24" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      )}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      <div className="flex gap-1">
        <button className="btn text-xs py-1" disabled={busy} onClick={submit}>Issue invoice</button>
        <button className="btn-ghost text-xs py-1" onClick={() => setOpen(false)}>✕</button>
      </div>
    </div>
  );
}

export function RecordPayment({ invoiceId, remaining }: { invoiceId: string; remaining: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("e-transfer");
  const [reference, setReference] = useState("");
  const [fromTrust, setFromTrust] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (remaining <= 0) return null;
  if (!open) return <button className="text-teal underline text-[10px] font-bold" onClick={() => setOpen(true)}>record payment</button>;

  return (
    <div className="mt-1 text-[11px] space-y-1">
      <div className="flex gap-1 flex-wrap items-center">
        <input className="input text-[11px] py-0.5 w-20" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="input text-[11px] py-0.5 w-24" value={method} onChange={(e) => setMethod(e.target.value)} disabled={fromTrust}>
          <option>e-transfer</option><option>wire</option><option>card</option><option>cash</option>
        </select>
        <input className="input text-[11px] py-0.5 w-24" placeholder="ref #" value={reference} onChange={(e) => setReference(e.target.value)} />
        <label className="flex items-center gap-1"><input type="checkbox" checked={fromTrust} onChange={(e) => setFromTrust(e.target.checked)} /> from trust (earning)</label>
        <button
          className="btn text-[11px] py-0.5"
          disabled={busy}
          onClick={async () => {
            setBusy(true); setError("");
            const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: parseFloat(amount), method, reference: reference || undefined, fromTrust }),
            });
            const d = await res.json().catch(() => ({}));
            setBusy(false);
            if (res.ok) { setOpen(false); router.refresh(); } else setError(d.error ?? "Failed");
          }}
        >Save</button>
        <button className="btn-ghost text-[11px] py-0.5" onClick={() => setOpen(false)}>✕</button>
      </div>
      {error && <div className="text-red-600 font-semibold">{error}</div>}
    </div>
  );
}
