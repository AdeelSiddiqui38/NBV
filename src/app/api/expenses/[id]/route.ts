import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  categoryId: z.string().optional(),
  vendor: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().positive().optional(),
  gstHstItc: z.number().optional(),
  status: z.enum(["INBOX", "CONFIRMED", "PENDING_APPROVAL", "APPROVED"]).optional(),
  campaign: z.string().optional().nullable(),
  caseId: z.string().optional().nullable(),
  billable: z.boolean().optional(),
});

// PATCH /api/expenses/[id] — update an expense (admin/accountant only)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "ACCOUNTANT"].includes(user.role)) {
    return NextResponse.json({ error: "Accountant or admin only" }, { status: 403 });
  }

  const expense = await db.expense.findUnique({ where: { id: params.id } });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;

  // Verify category if provided
  if (d.categoryId) {
    const category = await db.expenseCategory.findUnique({ where: { id: d.categoryId } });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const updated = await db.expense.update({
    where: { id: params.id },
    data: {
      ...(d.categoryId && { categoryId: d.categoryId }),
      ...(d.vendor && { vendor: d.vendor }),
      ...(d.date && { date: new Date(d.date) }),
      ...(d.amount && { amount: d.amount }),
      ...(d.gstHstItc !== undefined && { gstHstItc: d.gstHstItc }),
      ...(d.status && { status: d.status }),
      ...(d.campaign !== undefined && { campaign: d.campaign }),
      ...(d.caseId !== undefined && { caseId: d.caseId }),
      ...(d.billable !== undefined && { billable: d.billable }),
    },
    include: { category: true },
  });

  await logActivity(user, "expense", "updated", `${updated.vendor} — ${updated.amount}`, updated.id);
  return NextResponse.json(updated);
}

// DELETE /api/expenses/[id] — delete an expense (admin/accountant only)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "ACCOUNTANT"].includes(user.role)) {
    return NextResponse.json({ error: "Accountant or admin only" }, { status: 403 });
  }

  const expense = await db.expense.findUnique({ where: { id: params.id } });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  await db.expense.delete({ where: { id: params.id } });
  await logActivity(user, "expense", "deleted", `${expense.vendor}`, params.id);
  return NextResponse.json({ ok: true });
}
