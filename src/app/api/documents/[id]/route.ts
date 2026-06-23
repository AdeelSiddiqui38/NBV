import { NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { standardName } from "@/lib/storage";

const schema = z.object({
  docType: z.string().min(1).optional(),
  party: z.enum(["CLIENT", "SPOUSE", "CHILD", "CORP", "NBV"]).optional(),
  expiryDate: z.string().nullable().optional(), // null/empty clears it
});

// Correct a wrong docType/party/expiry without re-uploading — e.g. fixing a mis-picked
// dropdown, or clearing an expiry date that was mistakenly set on a permanent corp record.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await db.documentItem.findUnique({ where: { id: params.id }, include: { case: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.case.status === "CLOSED") return NextResponse.json({ error: "Closed file — read-only." }, { status: 422 });
  if (doc.locked) return NextResponse.json({ error: "Locked documents can only be superseded, not edited." }, { status: 422 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const docType = d.docType ? d.docType.toUpperCase().replace(/[^A-Z0-9_]/g, "_") : doc.docType;
  const party = d.party ?? doc.party;

  // Keep the auto-generated name in sync, reusing the original upload date (not today's).
  const datePart = doc.name.slice(0, 10);
  const ext = path.extname(doc.name);
  const name = standardName(docType, party, doc.version, ext, datePart);

  await db.documentItem.update({
    where: { id: doc.id },
    data: {
      docType,
      party,
      name,
      ...(d.expiryDate !== undefined && { expiryDate: d.expiryDate ? new Date(d.expiryDate) : null }),
    },
  });

  await logActivity(user, "document", "metadata_edited", `${doc.name} → ${name}`, doc.id);
  return NextResponse.json({ ok: true, name });
}
