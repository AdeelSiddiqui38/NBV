"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_ACTION: Record<string, { to: string; label: string }> = {
  RECEIVED: { to: "UNDER_REVIEW", label: "→ Review" },
  UNDER_REVIEW: { to: "APPROVED", label: "✓ Approve" },
  APPROVED: { to: "SUBMITTED", label: "→ Submitted" },
};

export default function DocActions({
  docId, status, locked, unfiled, folders,
}: { docId: string; status: string; locked: boolean; unfiled: boolean; folders: { id: string; label: string }[] }) {
  const router = useRouter();
  const [folderId, setFolderId] = useState(folders[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(payload: any) {
    setError(""); setBusy(true);
    const res = await fetch(`/api/documents/${docId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(d.error ?? "Failed");
  }

  const next = NEXT_ACTION[status];

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {unfiled && folders.length > 0 && (
        <>
          <select className="input text-xs py-0.5 w-44" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <button className="btn text-xs py-0.5" disabled={busy} onClick={() => act({ action: "FILE", folderId })}>File →</button>
        </>
      )}
      {!unfiled && next && !locked && (
        <button className="btn-ghost text-xs py-0.5" disabled={busy} onClick={() => act({ action: "SET_STATUS", status: next.to })}>
          {next.label}
        </button>
      )}
      {!unfiled && status === "APPROVED" && !locked && (
        <button className="btn-ghost text-xs py-0.5" disabled={busy} title="RCIC/Admin only" onClick={() => act({ action: "LOCK" })}>🔒</button>
      )}
      {error && <span className="text-red-600 font-semibold text-[10px]">{error}</span>}
    </span>
  );
}
