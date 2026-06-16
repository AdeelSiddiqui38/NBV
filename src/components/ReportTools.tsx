"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportTools({ kind }: { kind: "trust" | "yearend" | "scan" }) {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bank, setBank] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  if (kind === "trust") {
    return (
      <div className="flex gap-2 items-center flex-wrap text-xs">
        <input className="input text-xs py-1 w-32" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <input className="input text-xs py-1 w-36" type="number" placeholder="Bank balance (CAD)" value={bank} onChange={(e) => setBank(e.target.value)} />
        <a
          className="btn text-xs py-1.5"
          href={`/api/reports/trust-reconciliation?month=${month}${bank ? `&bank=${bank}` : ""}`}
        >
          Generate PDF
        </a>
      </div>
    );
  }

  if (kind === "yearend") {
    const parts = ["summary", "invoices", "payments", "gst", "expenses", "trust"];
    return (
      <div className="text-xs">
        <div className="flex gap-2 items-center mb-2">
          <input className="input text-xs py-1 w-24" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {parts.map((p) => (
            <a key={p} className="btn-ghost text-xs py-1" href={`/api/reports/year-end?year=${year}&part=${p}`}>
              ⬇ {p}.csv
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <button
        className="btn text-xs"
        disabled={busy}
        onClick={async () => {
          setBusy(true); setResult("");
          const res = await fetch("/api/jobs/scan", { method: "POST" });
          const d = await res.json().catch(() => ({}));
          setBusy(false);
          setResult(res.ok ? `✅ ${d.actions.length} actions: ${d.actions.slice(0, 5).join(" · ") || "none needed"}` : d.error ?? "Failed");
          router.refresh();
        }}
      >
        {busy ? "Scanning…" : "▶ Run scan now"}
      </button>
      {result && <div className="text-emerald-700 font-semibold mt-2">{result}</div>}
    </div>
  );
}
