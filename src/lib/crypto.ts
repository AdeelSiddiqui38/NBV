// Field-level encryption (AES-256-GCM) for sensitive values: passport numbers, UCI,
// TOTP secrets, bank details. Key from FIELD_KEY env (64 hex chars = 32 bytes).
// Production: source FIELD_KEY from a secret manager / KMS, rotate annually.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key(): Buffer {
  const hex = process.env.FIELD_KEY;
  if (!hex || hex.length !== 64) throw new Error("FIELD_KEY missing/invalid (need 64 hex chars)");
  return Buffer.from(hex, "hex");
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptField(stored: string): string {
  if (!stored.startsWith("enc:v1:")) return stored; // legacy plaintext passthrough
  const [, , ivB64, tagB64, ctB64] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}

export function maskValue(v: string): string {
  if (v.length <= 4) return "····";
  return "····" + v.slice(-4);
}

// One-time tokens (invites, password resets): raw token emailed; only sha256 stored.
export function newToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: createHash("sha256").update(raw).digest("hex") };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
