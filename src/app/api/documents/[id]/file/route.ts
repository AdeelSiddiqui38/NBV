import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { loadFile } from "@/lib/storage";
import { folderAllowed } from "@/lib/permissions";

// Download — role-checked, audit-logged (CICC: every view/download recorded)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await db.documentItem.findUnique({
    where: { id: params.id },
    include: { folder: true, case: true },
  });
  if (!doc || !doc.storageKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.folder && !folderAllowed(user.role, doc.folder.code))
    return NextResponse.json({ error: `Your role has no access to folder ${doc.folder.code}.` }, { status: 403 });

  const buf = await loadFile(doc.storageKey).catch(() => null);
  if (!buf) return NextResponse.json({ error: "File missing from storage" }, { status: 500 });

  await logActivity(user, "document", "downloaded", `${doc.case.fileNumber}: ${doc.name}`, doc.id);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.name}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
