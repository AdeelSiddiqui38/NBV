import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { encryptField, decryptField } from "@/lib/crypto";

// GET  → begin enrolment: returns secret + otpauth URI (user adds to authenticator app)
// POST → { code } verify the code: enables MFA  ·  { code, disable:true } disables (Admin can't disable others here)
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = authenticator.generateSecret();
  // stash pending secret encrypted on the user row (not yet enabled)
  await db.user.update({ where: { id: user.id }, data: { mfaSecretEnc: encryptField(secret) } });
  const uri = authenticator.keyuri(user.email, "NBV CRM", secret);
  return NextResponse.json({ secret, uri });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, disable } = await req.json().catch(() => ({}));
  const u = await db.user.findUnique({ where: { id: user.id } });
  if (!u?.mfaSecretEnc) return NextResponse.json({ error: "No enrolment in progress." }, { status: 422 });

  const secret = decryptField(u.mfaSecretEnc);
  if (!authenticator.verify({ token: String(code ?? ""), secret }))
    return NextResponse.json({ error: "Invalid code — check your authenticator app." }, { status: 422 });

  if (disable) {
    if (["ADMIN", "RCIC"].includes(u.role))
      return NextResponse.json({ error: "MFA is mandatory for Admin/RCIC roles — cannot disable." }, { status: 403 });
    await db.user.update({ where: { id: u.id }, data: { mfaEnabled: false, mfaSecretEnc: null } });
    await logActivity(user, "auth", "mfa_disabled", user.email);
    return NextResponse.json({ ok: true, mfaEnabled: false });
  }

  await db.user.update({ where: { id: u.id }, data: { mfaEnabled: true } });
  await logActivity(user, "auth", "mfa_enabled", user.email);
  return NextResponse.json({ ok: true, mfaEnabled: true });
}
