import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, logActivity } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";

const schema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[a-z]/, "Needs a lowercase letter")
    .regex(/[0-9]/, "Needs a digit"),
});

const COMMON = ["password1234", "123456789012", "qwerty123456", "letmein12345"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { token, password } = parsed.data;

  if (COMMON.includes(password.toLowerCase()))
    return NextResponse.json({ error: "Password is on the common-passwords blocklist." }, { status: 422 });

  const t = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!t || t.purpose !== "INVITE") return NextResponse.json({ error: "Invalid invitation link." }, { status: 404 });
  if (t.usedAt) return NextResponse.json({ error: "This invitation was already used." }, { status: 422 });
  if (t.expiresAt < new Date()) return NextResponse.json({ error: "Invitation expired — ask Admin to re-invite." }, { status: 422 });

  await db.$transaction([
    db.user.update({
      where: { id: t.userId },
      data: { passwordHash: await hashPassword(password), status: "ACTIVE" },
    }),
    db.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
  ]);

  await logActivity(null, "user", "invite_accepted", `${t.user.email} activated account`, t.userId);
  const mfaMandatory = ["ADMIN", "RCIC"].includes(t.user.role);
  return NextResponse.json({ ok: true, mfaMandatory });
}
