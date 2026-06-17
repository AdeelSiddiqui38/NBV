import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  name: z.string().optional(),
  gifiCode: z.string().optional().nullable(),
  monthlyBudget: z.number().optional().nullable(),
  itcRule: z.enum(["FULL", "MEALS_50", "NONE"]).optional(),
});

// PATCH /api/expense-categories/[id] — update category (admin only)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const category = await db.expenseCategory.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;

  // Check for duplicate name if changing
  if (d.name && d.name !== category.name) {
    const existing = await db.expenseCategory.findUnique({ where: { name: d.name } });
    if (existing) return NextResponse.json({ error: "Category name already exists" }, { status: 400 });
  }

  const updated = await db.expenseCategory.update({
    where: { id: params.id },
    data: {
      ...(d.name && { name: d.name }),
      ...(d.gifiCode !== undefined && { gifiCode: d.gifiCode }),
      ...(d.monthlyBudget !== undefined && { monthlyBudget: d.monthlyBudget }),
      ...(d.itcRule && { itcRule: d.itcRule }),
    },
  });

  await logActivity(user, "expense_category", "updated", `${updated.name}`, updated.id);
  return NextResponse.json(updated);
}

// DELETE /api/expense-categories/[id] — delete category (admin only)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const category = await db.expenseCategory.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  // Check if category has expenses
  const expenseCount = await db.expense.count({ where: { categoryId: params.id } });
  if (expenseCount > 0) {
    return NextResponse.json({ error: "Cannot delete category with expenses" }, { status: 400 });
  }

  await db.expenseCategory.delete({ where: { id: params.id } });
  await logActivity(user, "expense_category", "deleted", `${category.name}`, params.id);
  return NextResponse.json({ ok: true });
}
