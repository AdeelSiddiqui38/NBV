"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddFamilyMember({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ relationship: "SPOUSE", firstName: "", lastName: "", dateOfBirth: "", citizenship: "", passportExpiry: "", occupationOrGrade: "" });
  const [accompanying, setAccompanying] = useState(true);
  const [priorRefusals, setPriorRefusals] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    setError(""); setWarnings([]); setBusy(true);
    const res = await fetch(`/api/clients/${clientId}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, accompanying, priorRefusals, passportExpiry: f.passportExpiry || undefined, citizenship: f.citizenship || undefined, occupationOrGrade: f.occupationOrGrade || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      if (d.warnings?.length) setWarnings(d.warnings);
      setF({ relationship: "SPOUSE", firstName: "", lastName: "", dateOfBirth: "", citizenship: "", passportExpiry: "", occupationOrGrade: "" });
      router.refresh();
      if (!d.warnings?.length) setOpen(false);
    } else setError(d.error ?? "Failed");
  }

  if (!open)
    return (
      <div>
        <button className="btn-ghost text-xs" onClick={() => setOpen(true)}>+ Add family member</button>
        {warnings.map((w, i) => <div key={i} className="text-amber-600 text-xs font-semibold mt-1">⚠ {w}</div>)}
      </div>
    );

  return (
    <div className="border border-slate-200 rounded-lg p-3 mt-2 text-xs bg-slate-50">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <select className="input" value={f.relationship} onChange={set("relationship")}>
          <option value="SPOUSE">Spouse</option>
          <option value="COMMON_LAW">Common-law partner</option>
          <option value="CHILD">Child</option>
          <option value="PARENT">Parent (non-acc.)</option>
          <option value="OTHER">Other</option>
        </select>
        <input className="input" placeholder="First name *" value={f.firstName} onChange={set("firstName")} />
        <input className="input" placeholder="Last name *" value={f.lastName} onChange={set("lastName")} />
        <input className="input" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
        <input className="input" placeholder="Citizenship" value={f.citizenship} onChange={set("citizenship")} />
        <input className="input" type="date" placeholder="Passport expiry" value={f.passportExpiry} onChange={set("passportExpiry")} />
        <input className="input" placeholder="Occupation / school grade" value={f.occupationOrGrade} onChange={set("occupationOrGrade")} />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1"><input type="checkbox" checked={accompanying} onChange={(e) => setAccompanying(e.target.checked)} /> Accompanying</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={priorRefusals} onChange={(e) => setPriorRefusals(e.target.checked)} /> Prior refusals</label>
        </div>
      </div>
      {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
      {warnings.map((w, i) => <div key={i} className="text-amber-600 font-semibold mt-1">⚠ {w}</div>)}
      <div className="flex gap-2 mt-2">
        <button className="btn text-xs" disabled={busy} onClick={submit}>Add member</button>
        <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Done</button>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        Auto: dependent-eligibility (&lt;22), biometrics requirement (14–79), medical flag, LICO recalculation.
      </div>
    </div>
  );
}
