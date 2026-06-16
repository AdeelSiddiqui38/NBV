import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  if (action !== "SATISFY") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });

  const d = await db.deadline.update({ where: { id: params.id }, data: { satisfied: true }, include: { case: true } });
  await logActivity(user, "deadline", "satisfied", `${d.case.fileNumber}: ${d.label} marked satisfied`, d.id);
  return NextResponse.json({ ok: true });
}
