import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["APPROVE", "SEND", "MARK_AGREED", "DECLINE"]),
  acceptanceRef: z.string().optional(), // evidence for AGREED (email ref etc.)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const quote = await db.feeQuote.findUnique({ where: { id: params.id }, include: { adjustments: true, lead: true } });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const offer = quote.listPrice + quote.adjustments.reduce((s, a) => s + a.amount, 0);
  const { action, acceptanceRef } = parsed.data;

  if (action === "APPROVE") {
    if (user.role !== "ADMIN")
      return NextResponse.json({ error: "Only Admin/Owner can approve out-of-authority discounts." }, { status: 403 });
    await db.feeQuote.update({
      where: { id: quote.id },
      data: { status: "SENT", requiresApproval: false, approvedById: user.id, sentAt: new Date() },
    });
    await logActivity(user, "quote", "quote_approved", `${quote.number}: Owner approved $${offer} (below-authority discount)`, quote.id);
  } else if (action === "SEND") {
    if (quote.requiresApproval)
      return NextResponse.json({ error: "Quote is pending Owner approval — cannot send." }, { status: 422 });
    await db.feeQuote.update({ where: { id: quote.id }, data: { status: "SENT", sentAt: new Date() } });
    await logActivity(user, "quote", "quote_sent", `${quote.number} sent to ${quote.lead.name} — $${offer}`, quote.id);
  } else if (action === "MARK_AGREED") {
    if (quote.requiresApproval)
      return NextResponse.json({ error: "Cannot agree a quote that is pending Owner approval." }, { status: 422 });
    if (!acceptanceRef || acceptanceRef.length < 3)
      return NextResponse.json({ error: "Acceptance evidence required (e.g., 'client email Jun 12' or signature ref)." }, { status: 422 });
    await db.$transaction([
      db.feeQuote.update({
        where: { id: quote.id },
        data: { status: "AGREED", agreedAt: new Date(), agreedFee: offer, acceptanceRef },
      }),
      db.lead.update({ where: { id: quote.leadId }, data: { stage: "FEE_AGREED" } }),
    ]);
    await logActivity(user, "quote", "quote_agreed", `${quote.number} AGREED at $${offer} — evidence: ${acceptanceRef}`, quote.id);
  } else if (action === "DECLINE") {
    await db.feeQuote.update({ where: { id: quote.id }, data: { status: "DECLINED" } });
    await logActivity(user, "quote", "quote_declined", `${quote.number} declined by client`, quote.id);
  }

  return NextResponse.json({ ok: true });
}
