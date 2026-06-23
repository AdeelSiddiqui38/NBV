import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { decryptField, maskValue } from "@/lib/crypto";

// GET ?reveal=1 — masked by default; full reveal is RCIC/Admin-only and audit-logged
export async function GET(req: Request, { params }: { params: { id: string; memberId: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.familyMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.clientId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!member.passportNumber) return NextResponse.json({ ok: true, value: null });

  const reveal = new URL(req.url).searchParams.get("reveal") === "1";
  const plain = decryptField(member.passportNumber);

  if (reveal) {
    if (!["ADMIN", "RCIC"].includes(user.role))
      return NextResponse.json({ error: "Full reveal is RCIC/Admin-only." }, { status: 403 });
    await logActivity(user, "family", "viewed_sensitive", `Revealed passport # for ${member.firstName} ${member.lastName}`, member.id);
    return NextResponse.json({ ok: true, value: plain });
  }
  return NextResponse.json({ ok: true, value: maskValue(plain) });
}
