import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

// Nightly scanner: deadlines, document expiries, WP-expiry countdowns, overdue invoices,
// stale cases. Creates tasks/flags idempotently (no duplicates).
// Run manually from Reports page, or via cron:  curl -X POST .../api/jobs/scan -H "x-cron-key: $CRON_KEY"
export async function POST(req: Request) {
  const cronKey = req.headers.get("x-cron-key");
  const isCron = cronKey && cronKey === (process.env.CRON_KEY || "dev-cron-key");
  const user = isCron ? null : await getSession();
  if (!isCron && !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const actions: string[] = [];
  const openTaskExists = async (title: string, caseId: string) =>
    (await db.task.findFirst({ where: { title, caseId, status: "OPEN" } })) !== null;

  // 1. Deadlines within 14 days (unsatisfied) → HIGH task if none exists
  const soon = new Date(now.getTime() + 14 * 86400000);
  const deadlines = await db.deadline.findMany({
    where: { satisfied: false, dueDate: { lte: soon } },
    include: { case: true },
  });
  for (const d of deadlines) {
    if (d.case.status !== "OPEN") continue;
    const title = `⏰ Deadline approaching: ${d.label}`;
    if (!(await openTaskExists(title, d.caseId))) {
      await db.task.create({
        data: { title, caseId: d.caseId, assigneeId: d.case.caseManagerId ?? d.case.rcicId, dueDate: d.dueDate, priority: "HIGH" },
      });
      actions.push(`deadline-task: ${d.case.fileNumber} ${d.label}`);
    }
  }

  // 2. Document expiries within 90 days on open cases
  const exp90 = new Date(now.getTime() + 90 * 86400000);
  const docs = await db.documentItem.findMany({
    where: { expiryDate: { lte: exp90, gte: now }, status: { notIn: ["EXPIRED"] }, case: { status: "OPEN" } },
    include: { case: true },
  });
  for (const doc of docs) {
    const title = `📄 Expiring: ${doc.name} (${doc.expiryDate!.toISOString().slice(0, 10)})`;
    if (!(await openTaskExists(title, doc.caseId))) {
      await db.task.create({
        data: { title, caseId: doc.caseId, assigneeId: doc.case.caseManagerId ?? doc.case.rcicId, dueDate: doc.expiryDate, priority: "MED" },
      });
      actions.push(`doc-expiry-task: ${doc.case.fileNumber} ${doc.docType}`);
    }
  }
  // Mark already-expired docs
  const expired = await db.documentItem.updateMany({
    where: { expiryDate: { lt: now }, status: { notIn: ["EXPIRED", "SUBMITTED"] } },
    data: { status: "EXPIRED" },
  });
  if (expired.count) actions.push(`marked-expired: ${expired.count} docs`);

  // 3. WP expiry T-180: open extension-strategy task
  const t180 = new Date(now.getTime() + 180 * 86400000);
  const permits = await db.workPermitRecord.findMany({
    where: { permitEnd: { lte: t180, gte: now }, decision: "APPROVED" },
    include: { case: true },
  });
  for (const wp of permits) {
    if (wp.case.status !== "OPEN") continue;
    const title = `🛂 WP expires ${wp.permitEnd!.toISOString().slice(0, 10)} — extension/exit/PR strategy meeting`;
    if (!(await openTaskExists(title, wp.caseId))) {
      await db.task.create({
        data: { title, caseId: wp.caseId, assigneeId: wp.case.rcicId, dueDate: new Date(wp.permitEnd!.getTime() - 150 * 86400000), priority: "HIGH" },
      });
      actions.push(`wp-expiry-task: ${wp.case.fileNumber}`);
    }
  }

  // 4. Overdue invoices: SENT/PARTIAL past dueDate → OVERDUE
  const overdue = await db.invoice.updateMany({
    where: { status: { in: ["SENT", "PARTIAL"] }, dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
  if (overdue.count) actions.push(`marked-overdue: ${overdue.count} invoices`);

  // 5. Stale cases: open, no stage log in 14 days → flag task for case manager
  const stale = new Date(now.getTime() - 14 * 86400000);
  const openCases = await db.case.findMany({
    where: { status: "OPEN" },
    include: { stageLogs: { orderBy: { at: "desc" }, take: 1 } },
  });
  for (const c of openCases) {
    const last = c.stageLogs[0]?.at ?? c.openedAt;
    if (last < stale) {
      const title = `🐌 Stale case — no stage activity since ${last.toISOString().slice(0, 10)}`;
      if (!(await openTaskExists(title, c.id))) {
        await db.task.create({
          data: { title, caseId: c.id, assigneeId: c.caseManagerId ?? c.rcicId, priority: "MED" },
        });
        actions.push(`stale-flag: ${c.fileNumber}`);
      }
    }
  }

  await db.activityLog.create({
    data: {
      actorId: user?.id ?? null,
      actorName: user?.name ?? "Cron",
      entityType: "job",
      action: "nightly_scan",
      detail: actions.length ? actions.join(" | ") : "no actions needed",
    },
  });

  return NextResponse.json({ ok: true, actions });
}
