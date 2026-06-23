import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MAX_BYTES, saveFile } from "@/lib/storage";
import { scanPassportImage, PassportScanTimeout } from "@/lib/passportOcr";

export const runtime = "nodejs";
export const maxDuration = 30; // backstop above passportOcr's own 25s internal timeout

const ALLOWED = { "image/jpeg": true, "image/png": true } as const;

// POST multipart/form-data: file (passport bio-page photo/scan, JPG or PNG).
// Stores the image and returns OCR-read fields for the form to prefill — does not create a FamilyMember.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
  if (!(file.type in ALLOWED))
    return NextResponse.json(
      { error: "Upload a photo or scan (JPG/PNG) of the passport bio page. PDF isn't supported for OCR." },
      { status: 415 }
    );

  const buf = Buffer.from(await file.arrayBuffer());
  const storageKey = await saveFile(buf);

  let scan;
  try {
    scan = await scanPassportImage(buf);
  } catch (err) {
    const timedOut = err instanceof PassportScanTimeout;
    console.error("Passport scan failed:", err);
    // The image is already saved — return it with valid:false so the form still has the scan attached for manual entry.
    return NextResponse.json({
      ok: true,
      storageKey,
      mimeType: file.type,
      valid: false,
      fields: null,
      warnings: [
        timedOut
          ? "Passport scan timed out — try a clearer or smaller photo, or enter details manually below."
          : "Could not read this image — enter details manually and double-check against the attached scan.",
      ],
    });
  }

  return NextResponse.json({
    ok: true,
    storageKey,
    mimeType: file.type,
    valid: scan.valid,
    fields: scan.fields,
    warnings: scan.fields ? [] : ["Could not read the passport's MRZ — enter details manually and double-check against the attached scan."],
  });
}
