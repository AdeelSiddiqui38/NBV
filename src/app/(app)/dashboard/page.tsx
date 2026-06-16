import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtCad, fmtDate, daysUntil, STAGE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getSession();
  const [openCases, leads, deadlines, tasks, invoices, trustTxns] = await Promise.all([
    db.case.findMany({ where: { status: "OPEN" }, include: { client: true } }),
    db.lead.count({ where: { stage: { notIn: ["WON", "LOST"] } } }),
    db.deadline.findMany({
      where: { satisfied: false },
      include: { case: { include: { client: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    db.task.findMany({
      where: { status: "OPEN", assigneeId: user!.id },
      include: { case: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    db.invoice.findMany({ where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } } }),
    db.trustTransaction.findMany(),
  ]);

  const arOutstanding = invoices.reduce((s, i) => s + i.total, 0);
  const trustBalance = trustTxns.reduce(
    (s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount),
    0
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-5">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-2xl font-extrabold text-navy">{openCases.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active Cases</div>
        </div>
        <div className="card">
          <div className="text-2xl font-extrabold text-navy">{leads}</div>
          <div className="text-xs text-slate-500 mt-1">Open Leads</div>
        </div>
        <div className="card">
          <div className="text-2xl font-extrabold text-navy">{fmtCad(arOutstanding)}</div>
          <div className="text-xs text-slate-500 mt-1">Outstanding A/R</div>
        </div>
        <div className="card">
          <div className="text-2xl font-extrabold text-navy">{fmtCad(trustBalance)}</div>
          <div className="text-xs text-slate-500 mt-1">Trust Account Balance</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">⏰ Critical Deadlines</h3>
          {deadlines.length === 0 && <div className="text-sm text-slate-400">No open deadlines.</div>}
          {deadlines.map((d) => {
            const days = daysUntil(d.dueDate);
            const urgent = days !== null && days <= 14;
            return (
              <div key={d.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0 text-[13px]">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${urgent ? "bg-red-500" : "bg-amber-500"}`} />
                <div>
                  <b>{d.label}</b> — {d.case.client.firstName} {d.case.client.lastName}{" "}
                  <Link className="text-teal underline" href={`/cases/${d.caseId}`}>
                    {d.case.fileNumber}
                  </Link>
                  <div className="text-xs text-slate-500">
                    Due {fmtDate(d.dueDate)} {days !== null && `(${days} days)`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">✅ My Open Tasks</h3>
          {tasks.length === 0 && <div className="text-sm text-slate-400">Nothing assigned to you. 🎉</div>}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0 text-[13px]">
              <span
                className={`pill ${t.priority === "HIGH" ? "pill-red" : t.priority === "MED" ? "pill-amber" : "pill-gray"}`}
              >
                {t.priority}
              </span>
              <div>
                {t.title}
                {t.case && <span className="text-slate-400"> · {t.case.fileNumber}</span>}
                {t.dueDate && <div className="text-xs text-slate-500">Due {fmtDate(t.dueDate)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="text-sm font-bold text-navy mb-3">🗂 Open Cases</h3>
        <table className="w-full">
          <thead>
            <tr>
              <th>File #</th><th>Client</th><th>Type</th><th>Stage</th><th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {openCases.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td>
                  <Link className="font-bold text-navy underline" href={`/cases/${c.id}`}>
                    {c.fileNumber}
                  </Link>
                </td>
                <td>{c.client.firstName} {c.client.lastName}</td>
                <td>{c.caseType.replace(/_/g, " ")}</td>
                <td><span className="pill pill-blue">{STAGE_LABELS[c.currentStage] ?? c.currentStage}</span></td>
                <td>{fmtDate(c.openedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
