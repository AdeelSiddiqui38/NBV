import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2),
  caseId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["HIGH", "MED", "LOW"]).default("MED"),
});

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;
  const task = await db.task.create({
    data: {
      title: d.title,
      caseId: d.caseId || null,
      assigneeId: d.assigneeId || user.id,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      priority: d.priority,
    },
  });
  await logActivity(user, "task", "created", d.title, task.id);
  return NextResponse.json({ ok: true, id: task.id });
}
