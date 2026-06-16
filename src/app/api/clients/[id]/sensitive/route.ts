import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { encryptField, decryptField, maskValue } from "@/lib/crypto";

const putSchema = z.object({
  passportNumber: z.string().optional(),
  uciNumber: z.string().optional(),
});

// PUT — store sensitive fields encrypted (AES-256-GCM)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RCIC", "CASE_MANAGER"].includes(user.role))
    return NextResponse.json({ error: "No access to sensitive fields." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const data: any = {};
  if (parsed.data.passportNumber) data.passportNumber = encryptField(parsed.data.passportNumber);
  if (parsed.data.uciNumber) data.uciNumber = encryptField(parsed.data.uciNumber);
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to store." }, { status: 400 });

  await db.client.update({ where: { id: params.id }, data });
  await logActivity(user, "client", "sensitive_stored", `Fields updated (encrypted): ${Object.keys(data).join(", ")}`, params.id);
  return NextResponse.json({ ok: true });
}

// GET ?reveal=1 — masked by default; full reveal is RCIC/Admin-only and audit-logged
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reveal = new URL(req.url).searchParams.get("reveal") === "1";
  const client = await db.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields: Record<string, string | null> = { passportNumber: null, uciNumber: null };
  for (const f of ["passportNumber", "uciNumber"] as const) {
    const stored = client[f];
    if (!stored) continue;
    const plain = decryptField(stored);
    if (reveal) {
      if (!["ADMIN", "RCIC"].includes(user.role))
        return NextResponse.json({ error: "Full reveal is RCIC/Admin-only." }, { status: 403 });
      fields[f] = plain;
    } else {
      fields[f] = maskValue(plain);
    }
  }

  if (reveal)
    await logActivity(user, "client", "viewed_sensitive", `Revealed: passport/UCI for ${client.clientNumber}`, client.id);

  return NextResponse.json({ ok: true, reveal, fields });
}
