"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdvanceStage({
  caseId,
  currentStage,
  blocked,
}: {
  caseId: string;
  currentStage: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function advance() {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/cases/${caseId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setLoading(false);
    if (res.ok) {
      setNote("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed");
    }
  }

  return (
    <div className="text-xs">
      <div className="mb-2 text-slate-500">
        Current: <b>{currentStage.replace(/_/g, " ")}</b>
      </div>
      <input
        className="input mb-2"
        placeholder="Stage-change note (logged to timeline)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {blocked && (
        <div className="text-red-600 font-semibold mb-2">
          ⛔ Gates active — server will refuse the transition until resolved.
        </div>
      )}
      {error && <div className="text-red-600 font-semibold mb-2">{error}</div>}
      <button className="btn" onClick={advance} disabled={loading}>
        {loading ? "Advancing…" : "Advance to next stage →"}
      </button>
    </div>
  );
}
