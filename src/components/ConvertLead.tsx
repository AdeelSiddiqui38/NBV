"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Staff = { id: string; name: string; role: string };

export default function ConvertLead({
  leadId, leadName, staff, gateOpen,
}: { leadId: string; leadName: string; staff: Staff[]; gateOpen: boolean }) {
  const router = useRouter();
  const parts = leadName.split(" ");
  const [firstName, setFirstName] = useState(parts[0] ?? "");
  const [lastName, setLastName] = useState(parts.slice(1).join(" ") ?? "");
  const [dob, setDob] = useState("");
  const [mode, setMode] = useState("SOLE_OWNERSHIP");
  const [rcicId, setRcicId] = useState(staff.find((s) => s.role === "RCIC" || s.role === "ADMIN")?.id ?? "");
  const [cmId, setCmId] = useState(staff.find((s) => s.role === "CASE_MANAGER")?.id ?? "");
  const [deposit, setDeposit] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [conflict, setConflict] = useState(false);
  const [idv, setIdv] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(""); setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName, lastName, dateOfBirth: dob || undefined,
        engagementMode: mode, caseType: "C11_NEW",
        rcicId, caseManagerId: cmId || undefined,
        trustDeposit: parseFloat(deposit) || 0, trustReference: depositRef || undefined,
        conflictCheckClear: conflict, idVerified: idv,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.push(`/cases/${d.caseId}`);
      router.refresh();
    } else setError(d.error ?? "Failed");
  }

  return (
    <div className="text-xs space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">First name</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
        <div><label className="label">Last name</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Date of birth</label><input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
        <div>
          <label className="label">Engagement structure</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="SOLE_OWNERSHIP">A · Sole ownership (100%, pays all)</option>
            <option value="PARTNERSHIP_FINANCIAL">B · Partnership + NBV financial</option>
            <option value="PARTNERSHIP_SERVICES">C · Partnership — sweat equity</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Responsible RCIC</label>
          <select className="input" value={rcicId} onChange={(e) => setRcicId(e.target.value)}>
            {staff.filter((s) => ["RCIC", "ADMIN"].includes(s.role)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Case manager</label>
          <select className="input" value={cmId} onChange={(e) => setCmId(e.target.value)}>
            <option value="">—</option>
            {staff.filter((s) => s.role === "CASE_MANAGER").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Trust deposit received (CAD)</label><input className="input" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" /></div>
        <div><label className="label">Deposit reference</label><input className="input" value={depositRef} onChange={(e) => setDepositRef(e.target.value)} placeholder="wire/e-transfer ref" /></div>
      </div>
      <label className="flex items-center gap-2 pt-1">
        <input type="checkbox" checked={conflict} onChange={(e) => setConflict(e.target.checked)} />
        Conflict-of-interest check completed — <b>clear</b> (CICC)
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={idv} onChange={(e) => setIdv(e.target.checked)} />
        Client ID verified (passport sighted)
      </label>
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      <button className="btn w-full mt-2" disabled={busy || !gateOpen} onClick={submit}>
        {busy ? "Opening file…" : gateOpen ? "✅ Open client file (retainer signed)" : "⛔ Blocked — no agreed quote"}
      </button>
      <div className="text-[10px] text-slate-400">
        Creates: client record · case file (13 folders) · M1 invoice (30% of agreed fee) · trust deposit · onboarding task bundle. All logged.
      </div>
    </div>
  );
}
