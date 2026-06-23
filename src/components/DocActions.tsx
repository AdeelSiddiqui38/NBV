"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOC_TYPES } from "@/lib/constants";

const NEXT_ACTION: Record<string, { to: string; label: string }> = {
  RECEIVED: { to: "UNDER_REVIEW", label: "→ Review" },
  UNDER_REVIEW: { to: "APPROVED", label: "✓ Approve" },
  APPROVED: { to: "SUBMITTED", label: "→ Submitted" },
};

export default function DocActions({
  docId, status, locked, unfiled, folders, docType, party, expiryDate, simplified,
}: {
  docId: string; status: string; locked: boolean; unfiled: boolean; folders: { id: string; label: string }[];
  docType?: string; party?: string; expiryDate?: string | null; simplified?: boolean;
}) {
  const router = useRouter();
  const [folderId, setFolderId] = useState(folders[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDocType, setEditDocType] = useState(docType ?? "OTHER");
  const [editParty, setEditParty] = useState(party ?? "CLIENT");
  const [editExpiry, setEditExpiry] = useState(expiryDate ? expiryDate.slice(0, 10) : "");

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

  async function saveEdit() {
    setError(""); setBusy(true);
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType: editDocType, party: editParty, expiryDate: editExpiry || null }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setEditing(false); router.refresh(); }
    else setError(d.error ?? "Failed");
  }

  const next = NEXT_ACTION[status];

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1 flex-wrap">
        {unfiled && folders.length > 0 && (
          <>
            <select className="input text-xs py-0.5 w-44" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button className="btn text-xs py-0.5" disabled={busy} onClick={() => act({ action: "FILE", folderId })}>File →</button>
          </>
        )}
        {!unfiled && !simplified && next && !locked && (
          <button className="btn-ghost text-xs py-0.5" disabled={busy} onClick={() => act({ action: "SET_STATUS", status: next.to })}>
            {next.label}
          </button>
        )}
        {!unfiled && status === "APPROVED" && !locked && (
          <button className="btn-ghost text-xs py-0.5" disabled={busy} title="RCIC/Admin only" onClick={() => act({ action: "LOCK" })}>🔒</button>
        )}
        {!locked && <button className="btn-ghost text-xs py-0.5" disabled={busy} onClick={() => setEditing((v) => !v)}>{editing ? "✕" : "✏️ Edit"}</button>}
      </span>
      {editing && (
        <span className="inline-flex flex-col gap-1 bg-slate-50 border border-slate-200 rounded p-2">
          <select className="input text-xs py-0.5" value={editDocType} onChange={(e) => setEditDocType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select className="input text-xs py-0.5" value={editParty} onChange={(e) => setEditParty(e.target.value)}>
            <option value="CLIENT">Client</option>
            <option value="SPOUSE">Spouse</option>
            <option value="CHILD">Child</option>
            <option value="CORP">Corporation</option>
            <option value="NBV">NBV</option>
          </select>
          <input className="input text-xs py-0.5" type="date" title="Expiry date (clear if it never expires)" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
          <span className="flex gap-1">
            <button className="btn text-xs py-0.5" disabled={busy} onClick={saveEdit}>{busy ? "Saving…" : "Save"}</button>
            <button className="btn-ghost text-xs py-0.5" onClick={() => setEditing(false)}>Cancel</button>
          </span>
        </span>
      )}
      {error && <span className="text-red-600 font-semibold text-[10px]">{error}</span>}
    </span>
  );
}
