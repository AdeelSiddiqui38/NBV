import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  categoryId: z.string().min(1),
  vendor: z.string().min(1),
  date: z.string(),
  amount: z.number().positive(),
  gstHstItc: z.number().default(0),
  status: z.enum(["INBOX", "CONFIRMED", "PENDING_APPROVAL", "APPROVED"]).default("CONFIRMED"),
  campaign: z.string().optional().nullable(),
  caseId: z.string().optional().nullable(),
  billable: z.boolean().default(false),
});

// GET /api/expenses — list all expenses (authenticated users)
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expenses = await db.expense.findMany({
    include: { category: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json(expenses);
}

// POST /api/expenses — create a new expense (admin/accountant only)
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "ACCOUNTANT"].includes(user.role)) {
    return NextResponse.json({ error: "Accountant or admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;

  // Verify category exists
  const category = await db.expenseCategory.findUnique({ where: { id: d.categoryId } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const expense = await db.expense.create({
    data: {
      categoryId: d.categoryId,
      vendor: d.vendor,
      date: new Date(d.date),
      amount: d.amount,
      gstHstItc: d.gstHstItc,
      status: d.status,
      campaign: d.campaign || null,
      caseId: d.caseId || null,
      billable: d.billable,
    },
    include: { category: true },
  });

  await logActivity(user, "expense", "created", `${d.vendor} — ${d.amount}`, expense.id);
  return NextResponse.json(expense, { status: 201 });
}
