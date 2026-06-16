import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["DEPOSIT", "TRANSFER_TO_OPERATING", "DISBURSEMENT", "REFUND"]),
  amount: z.number().positive(),
  memo: z.string().min(3),
  method: z.string().optional(),
  reference: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RCIC"].includes(user.role))
    return NextResponse.json({ error: "Trust transactions require RCIC/Admin approval (CICC client-account rules)." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  // Trust integrity: balance can never go negative
  const txns = await db.trustTransaction.findMany({ where: { clientId: params.id } });
  const balance = txns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);
  if (d.type !== "DEPOSIT" && d.amount > balance)
    return NextResponse.json(
      { error: `⛔ Trust integrity: withdrawal $${d.amount} exceeds client trust balance $${balance}. Blocked.` },
      { status: 422 }
    );

  const txn = await db.trustTransaction.create({
    data: { clientId: params.id, ...d, enteredById: user.id, approvedById: user.id },
  });
  await logActivity(user, "trust", "trust_txn", `${d.type} $${d.amount} — ${d.memo}`, txn.id);
  return NextResponse.json({ ok: true, id: txn.id, newBalance: balance + (d.type === "DEPOSIT" ? d.amount : -d.amount) });
}
