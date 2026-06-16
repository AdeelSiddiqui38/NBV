import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { LIST_PRICE, FLOOR_PRICE, RCIC_MAX_DISCOUNT_PCT } from "@/lib/constants";

const adjSchema = z.object({
  type: z.enum(["PCT_DISCOUNT", "FIXED_REDUCTION", "SCOPE_REMOVED", "MARKET_ADJ", "EQUITY_CONSIDERATION"]),
  amount: z.number().max(0, "Adjustments must be ≤ 0 (reductions)"),
  reason: z.string().min(3, "Every adjustment needs a reason"),
});

const schema = z.object({
  adjustments: z.array(adjSchema).default([]),
  send: z.boolean().default(false),
});

// Create a new quote version for a lead — enforces the discount authority matrix.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const lead = await db.lead.findUnique({ where: { id: params.id }, include: { quotes: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { adjustments, send } = parsed.data;
  const totalAdj = adjustments.reduce((s, a) => s + a.amount, 0);
  const offer = LIST_PRICE + totalAdj;
  const discountPct = (Math.abs(totalAdj) / LIST_PRICE) * 100;

  // ── Discount authority matrix ──
  let requiresApproval = false;
  if (user.role === "CASE_MANAGER" && totalAdj < 0)
    return NextResponse.json({ error: "Case Managers may quote list price only — discounts need RCIC/Admin." }, { status: 403 });
  if (user.role === "RCIC" && (discountPct > RCIC_MAX_DISCOUNT_PCT || offer < FLOOR_PRICE)) requiresApproval = true;
  if (offer < FLOOR_PRICE && user.role !== "ADMIN") requiresApproval = true;

  const version = (lead.quotes.reduce((m, q) => Math.max(m, q.version), 0) || 0) + 1;
  const count = await db.feeQuote.count();
  const quote = await db.feeQuote.create({
    data: {
      number: `Q-2026-${String(count + 40).padStart(3, "0")}`,
      leadId: lead.id,
      version,
      listPrice: LIST_PRICE,
      agreedFee: null,
      status: requiresApproval ? "PENDING_APPROVAL" : send ? "SENT" : "DRAFT",
      requiresApproval,
      sentAt: send && !requiresApproval ? new Date() : null,
      expiresAt: new Date(Date.now() + 30 * 86400000),
      adjustments: { create: adjustments.map((a) => ({ ...a, createdById: user.id })) },
    },
  });

  if (lead.stage === "NEW" || lead.stage === "CONSULT_BOOKED" || lead.stage === "FEASIBILITY_SENT") {
    await db.lead.update({ where: { id: lead.id }, data: { stage: "QUOTE_SENT" } });
  }

  await logActivity(
    user, "quote", requiresApproval ? "quote_held_for_approval" : "quote_created",
    `${quote.number} v${version} for ${lead.name}: list $${LIST_PRICE} − $${Math.abs(totalAdj)} = $${offer}${requiresApproval ? " — exceeds authority, routed to Owner" : ""}`,
    quote.id
  );
  return NextResponse.json({ ok: true, id: quote.id, requiresApproval, offer });
}
