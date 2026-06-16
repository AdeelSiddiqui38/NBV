import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity, hashPassword } from "@/lib/auth";
import { newToken } from "@/lib/crypto";
import { sendMail } from "@/lib/mailer";
import { randomBytes } from "crypto";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "RCIC", "CASE_MANAGER", "PLAN_WRITER", "ACCOUNTANT"]),
  rcicLicenseNo: z.string().optional(),
});

// Admin invites a user → email with one-time link; user sets own password (+MFA for Admin/RCIC).
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Only Admin can invite users." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const existing = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 422 });

  // unusable random password until the invite is accepted
  const user = await db.user.create({
    data: {
      email: d.email.toLowerCase(),
      name: d.name,
      role: d.role,
      rcicLicenseNo: d.rcicLicenseNo || null,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      status: "INVITED",
    },
  });

  const { raw, hash } = newToken();
  await db.authToken.create({
    data: { userId: user.id, tokenHash: hash, purpose: "INVITE", expiresAt: new Date(Date.now() + 7 * 86400000) },
  });

  const base = process.env.APP_URL || "http://localhost:3000";
  await sendMail(
    d.email,
    "You're invited to NBV CRM",
    `${d.name}, ${me.name} invited you to Next Bridge Ventures CRM as ${d.role}.\nSet your password (link valid 7 days):\n${base}/invite/${raw}`
  );

  await logActivity(me, "user", "invited", `${d.name} <${d.email}> as ${d.role}`, user.id);
  return NextResponse.json({ ok: true, id: user.id });
}
