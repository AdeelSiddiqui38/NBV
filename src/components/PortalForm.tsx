"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalForm({ caseId, hasANumber }: { caseId: string; hasANumber: boolean }) {
  const router = useRouter();
  const [aNumber, setANumber] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function record(payload: any, okMsg: string) {
    setError(""); setMsg(""); setBusy(true);
    const res = await fetch(`/api/cases/${caseId}/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setMsg(okMsg); router.refresh(); }
    else setError(d.error ?? "Failed");
  }

  return (
    <div className="mt-3 text-xs border-t border-slate-100 pt-3">
      <div className="flex gap-2 flex-wrap items-center">
        <button className="btn-ghost text-xs py-1" disabled={busy} onClick={() => record({ offerSubmitted: true }, "Offer submission recorded.")}>
          Record offer submitted
        </button>
        <button className="btn-ghost text-xs py-1" disabled={busy} onClick={() => record({ complianceFeePaid: true }, "$230 compliance fee recorded.")}>
          Record $230 fee paid
        </button>
        {!hasANumber && (
          <>
            <input className="input text-xs py-1 w-40" placeholder="A-number" value={aNumber} onChange={(e) => setANumber(e.target.value)} />
            <button className="btn text-xs py-1" disabled={busy || !aNumber} onClick={() => record({ aNumber }, "✅ A-number recorded — WP gate released!")}>
              Record A-number
            </button>
          </>
        )}
      </div>
      {error && <div className="text-red-600 font-semibold mt-1">{error}</div>}
      {msg && <div className="text-emerald-700 font-semibold mt-1">{msg}</div>}
    </div>
  );
}
