import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  label: z.string().min(3),
  dueDate: z.string().min(8),
  kind: z.enum(["EAPR", "ADR", "WP_EXPIRY", "NOMINATION", "GENERAL"]).default("GENERAL"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const c = await db.case.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (c.status === "CLOSED") return NextResponse.json({ error: "Closed file." }, { status: 422 });

  const d = parsed.data;
  const due = new Date(d.dueDate);
  const deadline = await db.deadline.create({
    data: { caseId: c.id, label: d.label, dueDate: due, kind: d.kind },
  });

  // ADR deadlines are hard — auto-create a HIGH task for the case manager/RCIC
  if (d.kind === "ADR") {
    await db.task.create({
      data: {
        title: `Draft ADR response — ${d.label}`,
        caseId: c.id,
        assigneeId: c.caseManagerId ?? c.rcicId,
        dueDate: new Date(due.getTime() - 5 * 86400000), // internal cutoff 5 days before
        priority: "HIGH",
      },
    });
  }

  await logActivity(user, "deadline", "created", `${c.fileNumber}: ${d.label} due ${d.dueDate} (${d.kind})${d.kind === "ADR" ? " — HIGH task auto-created (T-5 internal cutoff)" : ""}`, deadline.id);
  return NextResponse.json({ ok: true, id: deadline.id });
}
