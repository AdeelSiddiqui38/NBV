import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  if (action !== "DONE") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  const task = await db.task.update({
    where: { id: params.id },
    data: { status: "DONE", completedAt: new Date() },
  });
  await logActivity(user, "task", "completed", task.title, task.id);
  return NextResponse.json({ ok: true });
}
