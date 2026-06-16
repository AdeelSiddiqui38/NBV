// Document storage. STORAGE_DRIVER=s3 -> AWS S3 (ca-central-1 recommended for PIPEDA).
// STORAGE_DRIVER unset/"local" -> local disk (dev only; not durable on most hosts).
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const DRIVER = process.env.STORAGE_DRIVER || "local";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || "ca-central-1";

export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "message/rfc822": ".eml",
};

export const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// Lazy import so @aws-sdk/client-s3 is only required when STORAGE_DRIVER=s3
async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({ region: S3_REGION });
}

export async function saveFile(buf: Buffer): Promise<string> {
  const key = randomUUID(); // non-guessable storage key

  if (DRIVER === "s3") {
    if (!S3_BUCKET) throw new Error("S3_BUCKET env var is required when STORAGE_DRIVER=s3");
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buf, ServerSideEncryption: "AES256" })
    );
    return key;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, key), buf);
  return key;
}

export async function loadFile(storageKey: string): Promise<Buffer> {
  // guard against path traversal — keys are UUIDs only
  if (!/^[a-f0-9-]{36}$/.test(storageKey)) throw new Error("Invalid storage key");

  if (DRIVER === "s3") {
    if (!S3_BUCKET) throw new Error("S3_BUCKET env var is required when STORAGE_DRIVER=s3");
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    const res = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: storageKey }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  return readFile(path.join(UPLOAD_DIR, storageKey));
}

// Enforced naming convention: YYYY-MM-DD_<DocType>_<Party>_v<N>.<ext>
export function standardName(docType: string, party: string, version: number, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]/g, "");
  return `${date}_${clean(docType)}_${clean(party)}_v${version}${ext}`;
}
