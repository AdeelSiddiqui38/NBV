"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteActions({ quoteId, status }: { quoteId: string; status: string }) {
  const router = useRouter();
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(action: string) {
    setError(""); setBusy(true);
    const res = await fetch(`/api/quotes/${quoteId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, acceptanceRef: evidence || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(d.error ?? "Failed");
  }

  if (["AGREED", "DECLINED", "EXPIRED"].includes(status)) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-2 flex-wrap items-center">
        {status === "PENDING_APPROVAL" && (
          <button className="btn-ghost text-xs py-1" disabled={busy} onClick={() => act("APPROVE")}>
            👑 Owner: approve discount
          </button>
        )}
        {status === "DRAFT" && (
          <button className="btn-ghost text-xs py-1" disabled={busy} onClick={() => act("SEND")}>Send</button>
        )}
        {["SENT", "NEGOTIATING"].includes(status) && (
          <>
            <input
              className="input text-xs py-1 w-52"
              placeholder="Acceptance evidence (email ref…)"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
            <button className="btn text-xs py-1" disabled={busy} onClick={() => act("MARK_AGREED")}>✅ Mark AGREED</button>
            <button className="btn-ghost text-xs py-1" disabled={busy} onClick={() => act("DECLINE")}>Declined</button>
          </>
        )}
      </div>
      {error && <div className="text-red-600 text-xs font-semibold mt-1">{error}</div>}
    </div>
  );
}
