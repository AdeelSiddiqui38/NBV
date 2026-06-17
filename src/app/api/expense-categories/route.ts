import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  gifiCode: z.string().optional().nullable(),
  monthlyBudget: z.number().optional().nullable(),
  itcRule: z.enum(["FULL", "MEALS_50", "NONE"]).default("FULL"),
});

// GET /api/expense-categories — list all categories
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await db.expenseCategory.findMany({
    include: { expenses: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

// POST /api/expense-categories — create a new category (admin only)
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;

  // Check for duplicate name
  const existing = await db.expenseCategory.findUnique({ where: { name: d.name } });
  if (existing) return NextResponse.json({ error: "Category name already exists" }, { status: 400 });

  const category = await db.expenseCategory.create({
    data: {
      name: d.name,
      gifiCode: d.gifiCode || null,
      monthlyBudget: d.monthlyBudget || null,
      itcRule: d.itcRule,
    },
  });

  await logActivity(user, "expense_category", "created", `${category.name}`, category.id);
  return NextResponse.json(category, { status: 201 });
}
