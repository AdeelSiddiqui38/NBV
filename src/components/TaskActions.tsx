"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteTask({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
      disabled={busy}
      title="Mark done"
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "DONE" }) });
        router.refresh();
      }}
    >
      ✓ done
    </button>
  );
}

export function NewTask({ caseId, staff }: { caseId?: string; staff: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(staff[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MED");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="btn-ghost text-xs py-1" onClick={() => setOpen(true)}>+ Task</button>;

  return (
    <div className="flex gap-1 flex-wrap items-center mt-1">
      <input className="input text-xs py-1 w-44" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input text-xs py-1 w-28" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
        {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input className="input text-xs py-1 w-32" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <select className="input text-xs py-1 w-20" value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option>HIGH</option><option>MED</option><option>LOW</option>
      </select>
      <button
        className="btn text-xs py-1"
        disabled={busy || !title}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, caseId, assigneeId, dueDate: dueDate || undefined, priority }) });
          setBusy(false); setOpen(false); setTitle("");
          router.refresh();
        }}
      >Add</button>
      <button className="btn-ghost text-xs py-1" onClick={() => setOpen(false)}>✕</button>
    </div>
  );
}
