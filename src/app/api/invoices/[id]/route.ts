import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const lineSchema = z.object({
  kind: z.enum(["FEE", "DISBURSEMENT"]),
  description: z.string().min(1),
  amount: z.number().positive(),
});

const schema = z.object({
  lines: z.array(lineSchema).min(1),
  taxRate: z.number().min(0).max(0.2).default(0.05),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
});

// PATCH /api/invoices/[id] — correct a wrongly assigned/adjusted invoice (lines, tax, due date)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "PLAN_WRITER")
    return NextResponse.json({ error: "Plan writers cannot edit invoices." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const inv = await db.invoice.findUnique({ where: { id: params.id }, include: { payments: true } });
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const subtotal = d.lines.reduce((s, l) => s + l.amount, 0);
  const feePortion = d.lines.filter((l) => l.kind === "FEE").reduce((s, l) => s + l.amount, 0);
  const total = Math.round((subtotal + feePortion * d.taxRate) * 100) / 100;

  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  if (total < paid - 0.01) {
    return NextResponse.json(
      { error: `New total ($${total}) is less than the $${paid} already paid on this invoice. Remove/adjust the payment first.` },
      { status: 422 }
    );
  }

  const status = d.status ?? (paid >= total - 0.01 && paid > 0 ? "PAID" : paid > 0 ? "PARTIAL" : inv.status === "VOID" ? "VOID" : inv.status);

  await db.$transaction([
    db.invoiceLine.deleteMany({ where: { invoiceId: inv.id } }),
    db.invoiceLine.createMany({ data: d.lines.map((l) => ({ ...l, invoiceId: inv.id })) }),
    db.invoice.update({
      where: { id: inv.id },
      data: {
        subtotal,
        taxRate: d.taxRate,
        total,
        status,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
      },
    }),
  ]);

  await logActivity(user, "invoice", "invoice_edited", `${inv.number}: total $${inv.total} → $${total}`, inv.id);
  return NextResponse.json({ ok: true, total });
}

// DELETE /api/invoices/[id] — permanently remove an invoice issued in error
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const inv = await db.invoice.findUnique({ where: { id: params.id }, include: { payments: true } });
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  await db.$transaction([
    db.payment.deleteMany({ where: { invoiceId: inv.id } }),
    db.invoiceLine.deleteMany({ where: { invoiceId: inv.id } }),
    db.invoice.delete({ where: { id: inv.id } }),
  ]);

  const paidNote = inv.payments.length > 0 ? ` (including ${inv.payments.length} recorded payment(s) totalling $${inv.payments.reduce((s, p) => s + p.amount, 0)})` : "";
  await logActivity(user, "invoice", "invoice_deleted", `${inv.number} · $${inv.total}${paidNote}`, params.id);
  return NextResponse.json({ ok: true });
}
