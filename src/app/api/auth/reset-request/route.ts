import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { newToken } from "@/lib/crypto";
import { sendMail } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

// Always returns ok (no user enumeration). Token valid 1 hour, single-use.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (user && user.status === "ACTIVE") {
    const { raw, hash } = newToken();
    await db.authToken.create({
      data: { userId: user.id, tokenHash: hash, purpose: "PASSWORD_RESET", expiresAt: new Date(Date.now() + 3600_000) },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
    await sendMail(user.email, "NBV CRM password reset", `Reset link (valid 1 hour, single use):\n${base}/reset/${raw}\nIf you didn't request this, ignore it.`);
  }
  return NextResponse.json({ ok: true });
}
