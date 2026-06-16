import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  amount: z.number().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
  fromTrust: z.boolean().default(false), // pay invoice from client's trust balance
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "PLAN_WRITER")
    return NextResponse.json({ error: "Plan writers cannot record payments." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const inv = await db.invoice.findUnique({ where: { id: params.id }, include: { payments: true, client: true } });
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.status === "VOID") return NextResponse.json({ error: "Invoice is void." }, { status: 422 });

  const paidSoFar = inv.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.round((inv.total - paidSoFar) * 100) / 100;
  if (d.amount > remaining + 0.01)
    return NextResponse.json({ error: `⛔ Overpayment: $${d.amount} exceeds remaining balance $${remaining}.` }, { status: 422 });

  // Paying from trust = an earning event: requires RCIC/Admin + sufficient trust balance,
  // and writes the paired TRANSFER_TO_OPERATING trust transaction (CICC).
  if (d.fromTrust) {
    if (!["ADMIN", "RCIC"].includes(user.role))
      return NextResponse.json({ error: "Trust → operating transfers require RCIC/Admin." }, { status: 403 });
    const txns = await db.trustTransaction.findMany({ where: { clientId: inv.clientId } });
    const trustBal = txns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);
    if (d.amount > trustBal)
      return NextResponse.json({ error: `⛔ Trust balance $${trustBal} insufficient for $${d.amount}.` }, { status: 422 });
    await db.trustTransaction.create({
      data: {
        clientId: inv.clientId,
        type: "TRANSFER_TO_OPERATING",
        amount: d.amount,
        memo: `Earned fees vs ${inv.number}`,
        reference: d.reference ?? null,
        enteredById: user.id,
        approvedById: user.id,
      },
    });
  }

  const newPaid = paidSoFar + d.amount;
  const newStatus = newPaid >= inv.total - 0.01 ? "PAID" : "PARTIAL";

  await db.$transaction([
    db.payment.create({
      data: { invoiceId: inv.id, amount: d.amount, method: d.fromTrust ? "trust transfer" : d.method ?? null, reference: d.reference ?? null },
    }),
    db.invoice.update({ where: { id: inv.id }, data: { status: newStatus } }),
  ]);

  await logActivity(
    user, "payment", "payment_recorded",
    `${inv.number}: $${d.amount} ${d.fromTrust ? "from TRUST (earning event — paired transfer logged)" : `via ${d.method ?? "?"}`} → ${newStatus}`,
    inv.id
  );
  return NextResponse.json({ ok: true, status: newStatus, remaining: Math.round((inv.total - newPaid) * 100) / 100 });
}
