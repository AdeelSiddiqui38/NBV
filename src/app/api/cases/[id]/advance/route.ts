import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { C11_STAGES } from "@/lib/constants";

// Server-side stage gates — the compliance backbone.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { note } = await req.json().catch(() => ({ note: "" }));

  const c = await db.case.findUnique({
    where: { id: params.id },
    include: {
      proposal: true,
      corp: { include: { shareholders: true, deal: true } },
      portal: true,
    },
  });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const idx = C11_STAGES.indexOf(c.currentStage as any);
  if (idx < 0 || idx >= C11_STAGES.length - 1)
    return NextResponse.json({ error: "Case is at final stage" }, { status: 400 });
  const next = C11_STAGES[idx + 1];

  // ── Hard gates ──
  const errors: string[] = [];

  // Gate: leaving PROPOSAL_DRAFTING requires RCIC sign-off
  if (c.currentStage === "PROPOSAL_DRAFTING" && c.proposal && !c.proposal.rcicSignedOffAt)
    errors.push("RCIC sign-off required on the business proposal.");

  // Gate: leaving INCORPORATION requires client ≥51%
  if (c.currentStage === "INCORPORATION" && c.corp) {
    const clientPct = c.corp.shareholders.filter((s) => s.party === "CLIENT").reduce((s, x) => s + x.pct, 0);
    if (clientPct < 51) errors.push(`Client ownership ${clientPct}% — C11 requires ≥51%.`);
    const nbvPct = c.corp.shareholders.filter((s) => s.party === "NBV").reduce((s, x) => s + x.pct, 0);
    if (nbvPct > 49) errors.push(`NBV stake ${nbvPct}% exceeds 49% cap.`);
    // Partnership COI gate
    const d = c.corp.deal;
    if (d && !(d.coiDisclosure && (d.ilaStatus === "CONFIRMED" || d.ilaStatus === "WAIVED") && d.clientConsent && d.retainerAddendum)) {
      errors.push("Partnership conflict-of-interest gate incomplete (disclosure / ILA / consent / addendum).");
    }
  }

  // Gate: leaving EMPLOYER_PORTAL requires A-number + compliance fee
  if (c.currentStage === "EMPLOYER_PORTAL") {
    if (!c.portal?.aNumber) errors.push("A-number not recorded — offer of employment must be completed first (hard gate).");
    if (!c.portal?.complianceFeePaidAt) errors.push("$230 employer compliance fee not recorded.");
  }

  // Gate: WP submission (leaving WP_PREP) is RCIC/Admin only
  if (c.currentStage === "WP_PREP" && !["RCIC", "ADMIN"].includes(user.role))
    errors.push("Only the responsible RCIC (or Admin) can record a WP submission.");

  if (errors.length)
    return NextResponse.json({ error: errors.join(" ") }, { status: 422 });

  await db.$transaction([
    db.case.update({ where: { id: c.id }, data: { currentStage: next } }),
    db.caseStageLog.create({
      data: { caseId: c.id, fromStage: c.currentStage, toStage: next, note: note || null, byUserId: user.id },
    }),
  ]);
  await logActivity(user, "case", "stage_changed", `${c.fileNumber}: ${c.currentStage} → ${next}`, c.id);

  return NextResponse.json({ ok: true, stage: next });
}
