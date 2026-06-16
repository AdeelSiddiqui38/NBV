"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SatisfyDeadline({ deadlineId }: { deadlineId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-emerald-600 hover:text-emerald-800 text-[10px] font-bold"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/deadlines/${deadlineId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "SATISFY" }) });
        router.refresh();
      }}
    >
      ✓ satisfied
    </button>
  );
}

export function NewDeadline({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [kind, setKind] = useState("GENERAL");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="btn-ghost text-xs py-1 mt-2" onClick={() => setOpen(true)}>+ Deadline</button>;

  return (
    <div className="mt-2 space-y-1 text-xs">
      <input className="input text-xs py-1" placeholder="Label (e.g., 'ADR response — source of funds')" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="flex gap-1">
        <input className="input text-xs py-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <select className="input text-xs py-1" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="GENERAL">General</option>
          <option value="ADR">ADR (hard — auto-task)</option>
          <option value="WP_EXPIRY">WP expiry</option>
          <option value="NOMINATION">Nomination</option>
        </select>
      </div>
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      <div className="flex gap-1">
        <button
          className="btn text-xs py-1"
          disabled={busy || !label || !dueDate}
          onClick={async () => {
            setBusy(true); setError("");
            const res = await fetch(`/api/cases/${caseId}/deadlines`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, dueDate, kind }) });
            const d = await res.json().catch(() => ({}));
            setBusy(false);
            if (res.ok) { setOpen(false); setLabel(""); setDueDate(""); router.refresh(); }
            else setError(d.error ?? "Failed");
          }}
        >Add</button>
        <button className="btn-ghost text-xs py-1" onClick={() => setOpen(false)}>✕</button>
      </div>
    </div>
  );
}
