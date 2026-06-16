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

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { token, password } = parsed.data;

  const t = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!t || t.purpose !== "PASSWORD_RESET" || t.usedAt || t.expiresAt < new Date())
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 422 });

  await db.$transaction([
    db.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null } }),
    db.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    // kill all existing sessions on password change
    db.session.updateMany({ where: { userId: t.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await logActivity(null, "auth", "password_reset", `${t.user.email} — all sessions revoked`, t.userId);
  return NextResponse.json({ ok: true });
}
