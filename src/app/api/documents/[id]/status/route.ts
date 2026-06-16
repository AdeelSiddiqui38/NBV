import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const FLOW: Record<string, string[]> = {
  REQUESTED: ["RECEIVED"],
  RECEIVED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "RECEIVED"], // back to RECEIVED = revisions needed
  APPROVED: ["SUBMITTED"],
  SUBMITTED: [],
  EXPIRED: [],
};

const schema = z.object({
  action: z.enum(["SET_STATUS", "FILE", "LOCK"]),
  status: z.string().optional(),
  folderId: z.string().optional(), // for FILE action (triage queue → folder)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const doc = await db.documentItem.findUnique({ where: { id: params.id }, include: { case: { include: { folders: true } } } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.case.status === "CLOSED") return NextResponse.json({ error: "Closed file — read-only." }, { status: 422 });

  const { action, status, folderId } = parsed.data;

  if (action === "FILE") {
    if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });
    const folder = doc.case.folders.find((f) => f.id === folderId);
    if (!folder) return NextResponse.json({ error: "Folder not in this case" }, { status: 400 });
    await db.documentItem.update({ where: { id: doc.id }, data: { folderId, unfiled: false } });
    await logActivity(user, "document", "filed", `${doc.name} → folder ${folder.code} ${folder.name}`, doc.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "LOCK") {
    if (!["ADMIN", "RCIC"].includes(user.role))
      return NextResponse.json({ error: "Only RCIC/Admin can lock documents." }, { status: 403 });
    await db.documentItem.update({ where: { id: doc.id }, data: { locked: true } });
    await logActivity(user, "document", "locked", `${doc.name} locked (immutable; supersede-only)`, doc.id);
    return NextResponse.json({ ok: true });
  }

  // SET_STATUS — enforce the lifecycle
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });
  const allowed = FLOW[doc.status] ?? [];
  if (!allowed.includes(status))
    return NextResponse.json({ error: `Invalid transition ${doc.status} → ${status}. Allowed: ${allowed.join(", ") || "none"}.` }, { status: 422 });
  if (status === "APPROVED" && !["ADMIN", "RCIC", "CASE_MANAGER"].includes(user.role))
    return NextResponse.json({ error: "Approval requires staff reviewer role." }, { status: 403 });

  await db.documentItem.update({ where: { id: doc.id }, data: { status } });
  await logActivity(user, "document", "doc_status", `${doc.name}: ${doc.status} → ${status} (reviewer: ${user.name})`, doc.id);
  return NextResponse.json({ ok: true });
}
