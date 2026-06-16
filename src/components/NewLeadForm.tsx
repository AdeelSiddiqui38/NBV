"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", country: "", sector: "", province: "", source: "", scorecard: "", scorecardNote: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    setError(""); setBusy(true);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, scorecard: f.scorecard || undefined, email: f.email || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setF({ name: "", email: "", phone: "", country: "", sector: "", province: "", source: "", scorecard: "", scorecardNote: "" });
      router.refresh();
    } else setError(d.error ?? "Failed");
  }

  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ New Lead</button>;

  return (
    <div className="card mb-4">
      <h3 className="text-sm font-bold text-navy mb-3">New lead</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <input className="input" placeholder="Full name *" value={f.name} onChange={set("name")} />
        <input className="input" placeholder="Email" value={f.email} onChange={set("email")} />
        <input className="input" placeholder="Phone" value={f.phone} onChange={set("phone")} />
        <input className="input" placeholder="Country" value={f.country} onChange={set("country")} />
        <input className="input" placeholder="Business sector" value={f.sector} onChange={set("sector")} />
        <input className="input" placeholder="Province (AB/BC/SK…)" value={f.province} onChange={set("province")} />
        <input className="input" placeholder="Source (website/agent/referral)" value={f.source} onChange={set("source")} />
        <select className="input" value={f.scorecard} onChange={set("scorecard")}>
          <option value="">Scorecard…</option>
          <option value="GREEN">GREEN</option>
          <option value="AMBER">AMBER</option>
          <option value="RED">RED</option>
        </select>
      </div>
      <input className="input mt-2" placeholder="Scorecard note (capital, experience, benefit angle, intent…)" value={f.scorecardNote} onChange={set("scorecardNote")} />
      {error && <div className="text-red-600 text-xs font-semibold mt-2">{error}</div>}
      <div className="flex gap-2 mt-3">
        <button className="btn" disabled={busy} onClick={submit}>Create lead</button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
