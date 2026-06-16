import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { ALLOWED_MIME, MAX_BYTES, saveFile, sha256, standardName } from "@/lib/storage";
import { folderAllowed } from "@/lib/permissions";

// POST multipart/form-data: file, folderId (optional → unfiled queue), docType, party, expiryDate?
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const c = await db.case.findUnique({ where: { id: params.id }, include: { folders: true } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (c.status === "CLOSED")
    return NextResponse.json({ error: "⛔ Closed file — repository is read-only (CICC)." }, { status: 422 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });

  const file = form.get("file") as File | null;
  const folderId = (form.get("folderId") as string) || null;
  const docType = ((form.get("docType") as string) || "OTHER").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const party = ((form.get("party") as string) || "CLIENT").toUpperCase();
  const expiryDate = (form.get("expiryDate") as string) || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
  const ext = ALLOWED_MIME[file.type];
  if (!ext)
    return NextResponse.json({ error: `File type '${file.type || "unknown"}' not allowed (pdf, jpg, png, docx, xlsx, eml).` }, { status: 415 });

  let folder = null;
  if (folderId) {
    folder = c.folders.find((f) => f.id === folderId);
    if (!folder) return NextResponse.json({ error: "Folder not in this case" }, { status: 400 });
    if (!folderAllowed(user.role, folder.code))
      return NextResponse.json({ error: `Your role (${user.role}) has no access to folder ${folder.code}.` }, { status: 403 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);

  // Versioning: same docType+party+folder → new version, never overwrite
  const prior = await db.documentItem.findFirst({
    where: { caseId: c.id, docType, party, folderId },
    orderBy: { version: "desc" },
  });
  if (prior?.locked)
    return NextResponse.json({ error: `⛔ '${prior.name}' is locked — locked documents can only be superseded by RCIC action.` }, { status: 422 });
  const version = prior ? prior.version + 1 : 1;
  if (prior) {
    await db.documentItem.update({ where: { id: prior.id }, data: { status: "EXPIRED" } }); // superseded
  }

  const storageKey = await saveFile(buf);
  const name = standardName(docType, party, version, ext);

  const doc = await db.documentItem.create({
    data: {
      caseId: c.id,
      folderId,
      docType,
      party,
      name,
      status: "RECEIVED",
      unfiled: !folderId, // no folder yet → triage queue
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      sha256: hash,
      version,
      storageKey,
      size: buf.length,
      mimeType: file.type,
      uploadedBy: user.id,
    },
  });

  await logActivity(
    user, "document", "uploaded",
    `${c.fileNumber}: ${name} → ${folder ? `folder ${folder.code} ${folder.name}` : "UNFILED queue"} · sha256 ${hash.slice(0, 12)}… · ${(buf.length / 1024).toFixed(0)} KB${version > 1 ? ` · supersedes v${version - 1}` : ""}`,
    doc.id
  );

  return NextResponse.json({ ok: true, id: doc.id, name, version, sha256: hash, unfiled: !folderId });
}
