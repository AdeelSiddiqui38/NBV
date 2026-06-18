import Link from "next/link";
import { db } from "@/lib/db";
import { STAGE_LABELS, C11_STAGES, fmtDate, daysUntil } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await db.case.findMany({
    include: {
      client: true,
      rcic: true,
      deadlines: { where: { satisfied: false }, orderBy: { dueDate: "asc" }, take: 1 },
      proposal: true,
      corp: true,
      portal: true,
    },
    orderBy: { openedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-5">C11 Cases — All Files</h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr><th>File #</th><th>Client</th><th>Type</th><th>Mode</th><th>Stage</th><th>Progress</th><th>RCIC</th><th>Next deadline</th></tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const stageIdx = C11_STAGES.indexOf(c.currentStage as any);
              const pct = stageIdx >= 0 ? Math.round((stageIdx / (C11_STAGES.length - 1)) * 100) : 0;
              const next = c.deadlines[0];
              const days = next ? daysUntil(next.dueDate) : null;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td>
                    <Link href={`/cases/${c.id}`} className="font-bold text-navy underline">{c.fileNumber}</Link>
                  </td>
                  <td>{c.client.firstName} {c.client.lastName}</td>
                  <td>{c.caseType.replace(/_/g, " ")}</td>
                  <td>
                    {c.engagementMode === "SOLE_OWNERSHIP" && <span className="pill pill-green">A</span>}
                    {c.engagementMode === "PARTNERSHIP_FINANCIAL" && <span className="pill pill-purple">B</span>}
                    {c.engagementMode === "PARTNERSHIP_SERVICES" && <span className="pill pill-blue">C</span>}
                  </td>
                  <td><span className="pill pill-blue">{STAGE_LABELS[c.currentStage] ?? c.currentStage}</span></td>
                  <td>
                    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="text-xs">{c.rcic.name}</td>
                  <td className={days !== null && days <= 14 ? "text-red-600 font-bold text-xs" : "text-xs"}>
                    {next ? `${next.label} · ${fmtDate(next.dueDate)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
