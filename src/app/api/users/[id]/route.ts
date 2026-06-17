import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN","RCIC","CASE_MANAGER","PLAN_WRITER","ACCOUNTANT"]).optional(),
  status: z.enum(["ACTIVE","SUSPENDED"]).optional(),
  rcicLicenseNo: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (me.id === params.id) return NextResponse.json({ error: "Cannot modify your own account here." }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const updated = await db.user.update({ where: { id: params.id }, data: {
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.role && { role: parsed.data.role }),
    ...(parsed.data.status && { status: parsed.data.status }),
    ...(parsed.data.rcicLicenseNo !== undefined && { rcicLicenseNo: parsed.data.rcicLicenseNo || null }),
  }});
  await logActivity(me, "user", "updated", `${updated.name} — ${updated.role} / ${updated.status}`, updated.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (me.id === params.id) return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Delete related records first to avoid foreign key constraint errors
  await db.authToken.deleteMany({ where: { userId: params.id } });
  await db.loginEvent.deleteMany({ where: { email: user.email } });

  await db.user.delete({ where: { id: params.id } });
  await logActivity(me, "user", "deleted", `${user.name} <${user.email}>`, me.id);
  return NextResponse.json({ ok: true });
}
