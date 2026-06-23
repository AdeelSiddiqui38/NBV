// Reads the machine-readable zone (MRZ) off a passport bio-page photo/scan.
// Self-hosted: Tesseract.js (OCR) + mrz (checksum-validated field parsing). No external API/key.
import { createWorker } from "tesseract.js";
import { parse } from "mrz";

const MRZ_LINE = /^[A-Z0-9<]{30,44}$/;
const MRZ_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";

export interface PassportFields {
  firstName: string;
  lastName: string;
  sex: string | null;
  nationality: string | null;
  passportNumber: string | null;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  passportExpiry: string | null; // ISO yyyy-mm-dd
}

export interface PassportScanResult {
  valid: boolean;
  fields: PassportFields | null;
  rawMrz: string | null;
}

// MRZ dates are YYMMDD with no century. Birth dates skew past, expiry dates skew future.
function mrzDateToISO(yymmdd: string | null | undefined, bias: "past" | "future"): string | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const century = bias === "future" ? (yy < currentYY + 30 ? 2000 : 1900) : yy > currentYY ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

export async function scanPassportImage(buf: Buffer): Promise<PassportScanResult> {
  const worker = await createWorker("eng");
  try {
    await worker.setParameters({ tessedit_char_whitelist: MRZ_WHITELIST });
    const { data } = await worker.recognize(buf);
    const candidateLines = (data.lines ?? [])
      .map((l) => l.text.replace(/\s+/g, "").toUpperCase())
      .filter((t) => MRZ_LINE.test(t));
    if (candidateLines.length < 2) return { valid: false, fields: null, rawMrz: null };

    const mrzLines = candidateLines.slice(-2); // TD3 passport format: last 2 matching lines
    const result = parse(mrzLines);
    const f = result.fields;

    const fields: PassportFields = {
      firstName: f.firstName ?? "",
      lastName: f.lastName ?? "",
      sex: f.sex ?? null,
      nationality: f.nationality ?? null,
      passportNumber: f.documentNumber ?? null,
      dateOfBirth: mrzDateToISO(f.birthDate, "past"),
      passportExpiry: mrzDateToISO(f.expirationDate, "future"),
    };
    return { valid: result.valid, fields, rawMrz: mrzLines.join("\n") };
  } finally {
    await worker.terminate();
  }
}
