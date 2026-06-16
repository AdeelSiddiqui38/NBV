import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticator } from "otplib";
import { db } from "@/lib/db";
import { verifyPassword, createSession, logActivity } from "@/lib/auth";
import { decryptField } from "@/lib/crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
});
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { email, password, mfaCode } = parsed.data;
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  const fail = async (msg: string, status = 401) => {
    await db.loginEvent.create({ data: { email, userId: user?.id ?? null, success: false, ip } });
    return NextResponse.json({ error: msg }, { status });
  };

  if (!user || user.status !== "ACTIVE") return fail("Invalid credentials");
  if (user.lockedUntil && user.lockedUntil > new Date())
    return fail(`Account locked. Try again after ${user.lockedUntil.toLocaleTimeString()}`, 423);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return fail("Invalid credentials");
  }

  // ── MFA second factor ──
  if (user.mfaEnabled && user.mfaSecretEnc) {
    if (!mfaCode) return NextResponse.json({ mfaRequired: true }, { status: 200 }); // password ok → ask for code
    const secret = decryptField(user.mfaSecretEnc);
    if (!authenticator.verify({ token: mfaCode, secret })) {
      await db.loginEvent.create({ data: { email, userId: user.id, success: false, ip } });
      return NextResponse.json({ error: "Invalid authenticator code." }, { status: 401 });
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await db.loginEvent.create({ data: { email, userId: user.id, success: true, ip } });

  const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  await createSession(sessionUser, ip);
  await logActivity(sessionUser, "auth", "login", `Signed in from ${ip}`);

  return NextResponse.json({ ok: true });
}
