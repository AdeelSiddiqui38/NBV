import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { loadFile } from "@/lib/storage";

// Download the attached passport scan — role-checked, audit-logged.
export async function GET(_req: Request, { params }: { params: { id: string; memberId: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.familyMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.clientId !== params.id || !member.passportImageKey)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buf = await loadFile(member.passportImageKey).catch(() => null);
  if (!buf) return NextResponse.json({ error: "File missing from storage" }, { status: 500 });

  await logActivity(user, "family", "passport_viewed", `${member.firstName} ${member.lastName}`, member.id);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": member.passportImageMime ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="passport-${member.id}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
