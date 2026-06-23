import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { MILESTONE_SPLIT } from "@/lib/constants";
import { nextNumber } from "@/lib/sequence";

const lineSchema = z.object({
  kind: z.enum(["FEE", "DISBURSEMENT"]),
  description: z.string().min(2),
  amount: z.number().positive(),
});

const schema = z.object({
  milestoneIndex: z.number().int().min(0).max(3).optional(), // auto-amount from agreed fee
  lines: z.array(lineSchema).default([]),
  taxRate: z.number().min(0).max(0.2).default(0.05),
  dueDays: z.number().int().min(0).default(14),
});

// Create an invoice — milestone invoices derive from the AGREED FEE (single source of truth)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "PLAN_WRITER")
    return NextResponse.json({ error: "Plan writers cannot issue invoices." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const c = await db.case.findUnique({ where: { id: params.id }, include: { invoices: true } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  let lines = [...d.lines];
  let milestone: string | null = null;

  if (d.milestoneIndex !== undefined) {
    if (!c.agreedFee)
      return NextResponse.json({ error: "Case has no agreed fee — milestone invoicing unavailable." }, { status: 422 });
    const m = MILESTONE_SPLIT[d.milestoneIndex];
    // prevent double-billing the same milestone
    if (c.invoices.some((i) => i.milestone === m.label && i.status !== "VOID"))
      return NextResponse.json({ error: `⛔ ${m.label} has already been invoiced (no double-billing).` }, { status: 422 });
    milestone = m.label;
    const amount = Math.round(c.agreedFee * (m.pct / 100));
    lines.unshift({ kind: "FEE", description: `${m.label} (${m.pct}% of agreed fee $${c.agreedFee})`, amount });
  }

  if (lines.length === 0) return NextResponse.json({ error: "Invoice needs at least one line." }, { status: 400 });

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  // GST applies to fees; disbursements pass through untaxed
  const feePortion = lines.filter((l) => l.kind === "FEE").reduce((s, l) => s + l.amount, 0);
  const total = Math.round((subtotal + feePortion * d.taxRate) * 100) / 100;

  const invoicePrefix = "NBV-INV-2026-";
  const invoiceNumber = await nextNumber({
    current: async () => (await db.invoice.findFirst({ where: { number: { startsWith: invoicePrefix } }, orderBy: { number: "desc" }, select: { number: true } }))?.number ?? null,
    prefix: invoicePrefix,
    padLen: 4,
    start: 50,
  });
  const inv = await db.invoice.create({
    data: {
      number: invoiceNumber,
      clientId: c.clientId,
      caseId: c.id,
      milestone,
      status: "SENT",
      dueDate: new Date(Date.now() + d.dueDays * 86400000),
      subtotal,
      taxRate: d.taxRate,
      total,
      lines: { create: lines },
    },
  });

  await logActivity(user, "invoice", "invoice_issued", `${inv.number} · ${c.fileNumber} · $${total}${milestone ? ` · ${milestone}` : ""}`, inv.id);
  return NextResponse.json({ ok: true, id: inv.id, number: inv.number, total });
}
