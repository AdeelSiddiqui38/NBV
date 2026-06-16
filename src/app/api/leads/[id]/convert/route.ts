import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { FOLDER_TAXONOMY, MILESTONE_SPLIT } from "@/lib/constants";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  maritalStatus: z.string().optional(),
  engagementMode: z.enum(["SOLE_OWNERSHIP", "PARTNERSHIP_FINANCIAL", "PARTNERSHIP_SERVICES"]),
  caseType: z.enum(["C11_NEW", "C11_PURCHASE", "C11_EXTENSION"]).default("C11_NEW"),
  rcicId: z.string().min(1),
  caseManagerId: z.string().optional(),
  trustDeposit: z.number().min(0).default(0),
  trustReference: z.string().optional(),
  conflictCheckClear: z.boolean(),
  idVerified: z.boolean(),
});

// ⛔ THE ONBOARDING GATE: lead can only convert with an AGREED quote.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RCIC"].includes(user.role))
    return NextResponse.json({ error: "Only an RCIC or Admin can open a client file (retainer signing)." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const data = parsed.data;

  if (!data.conflictCheckClear)
    return NextResponse.json({ error: "Conflict-of-interest check must be confirmed clear before opening a file (CICC)." }, { status: 422 });
  if (!data.idVerified)
    return NextResponse.json({ error: "Client ID verification must be confirmed before opening a file." }, { status: 422 });

  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: { quotes: { where: { status: "AGREED" }, orderBy: { agreedAt: "desc" } } },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.clientId) return NextResponse.json({ error: "Lead already converted." }, { status: 422 });

  const agreedQuote = lead.quotes[0];
  if (!agreedQuote)
    return NextResponse.json(
      { error: "⛔ Onboarding gate: no AGREED quote on this lead. Fee must be negotiated and agreed before onboarding." },
      { status: 422 }
    );

  const agreedFee = agreedQuote.agreedFee!;
  const year = new Date().getFullYear();
  const clientCount = await db.client.count();
  const caseCount = await db.case.count();
  const clientNumber = `NBV-C-${year}-${String(clientCount + 10).padStart(4, "0")}`;
  const fileNumber = `NBV-${year}-${String(caseCount + 10).padStart(4, "0")}`;

  const result = await db.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        clientNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: lead.email,
        phone: lead.phone,
        country: lead.country,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        maritalStatus: data.maritalStatus,
        source: lead.source,
        pipedaConsentAt: new Date(),
      },
    });

    const c = await tx.case.create({
      data: {
        fileNumber,
        clientId: client.id,
        caseType: data.caseType,
        engagementMode: data.engagementMode,
        currentStage: "ONBOARDING",
        rcicId: data.rcicId,
        caseManagerId: data.caseManagerId || null,
        agreedFee,
        folders: { create: FOLDER_TAXONOMY.map(([code, name]) => ({ code, name })) },
      },
    });

    await tx.caseStageLog.create({
      data: {
        caseId: c.id,
        toStage: "ONBOARDING",
        note: `File opened (retainer). Agreed fee ${agreedFee} per ${agreedQuote.number} (evidence: ${agreedQuote.acceptanceRef}). Conflict check clear ✓ ID verified ✓.`,
        byUserId: user.id,
      },
    });

    // First milestone invoice from the agreed fee — single source of truth
    const m1 = MILESTONE_SPLIT[0];
    const m1Amount = Math.round(agreedFee * (m1.pct / 100));
    const invCount = await tx.invoice.count();
    await tx.invoice.create({
      data: {
        number: `NBV-INV-2026-${String(invCount + 50).padStart(4, "0")}`,
        clientId: client.id,
        caseId: c.id,
        milestone: m1.label,
        status: "SENT",
        dueDate: new Date(Date.now() + 14 * 86400000),
        subtotal: m1Amount,
        taxRate: 0.05,
        total: Math.round(m1Amount * 1.05),
        lines: { create: [{ kind: "FEE", description: `${m1.label} (${m1.pct}% of agreed fee)`, amount: m1Amount }] },
      },
    });

    // Trust deposit if received
    if (data.trustDeposit > 0) {
      await tx.trustTransaction.create({
        data: {
          clientId: client.id,
          type: "DEPOSIT",
          amount: data.trustDeposit,
          memo: "Retainer advance (file opening)",
          reference: data.trustReference || null,
          enteredById: user.id,
          approvedById: user.id,
        },
      });
    }

    // Onboarding task bundle (auto)
    const tasks = [
      "Upload signed retainer to folder 01",
      "IMM 5476 (Use of Representative) — prepare & track signature",
      "Record intent-strategy advice entry (locked)",
      "Complete Family Panel — all members, accompanying flags",
      "Collect entrepreneur profile (CV, prior businesses, net worth)",
    ];
    for (const title of tasks) {
      await tx.task.create({
        data: { title, caseId: c.id, assigneeId: data.caseManagerId || data.rcicId, dueDate: new Date(Date.now() + 7 * 86400000), priority: "MED" },
      });
    }

    await tx.lead.update({
      where: { id: lead.id },
      data: { stage: "WON", convertedAt: new Date(), clientId: client.id },
    });

    return { client, case: c };
  });

  await logActivity(
    user, "client", "client_onboarded",
    `${lead.name} → ${clientNumber} / ${fileNumber}. Agreed fee $${agreedFee} (${agreedQuote.number}). Mode: ${data.engagementMode}. M1 invoice issued.`,
    result.client.id
  );

  return NextResponse.json({ ok: true, clientId: result.client.id, caseId: result.case.id, fileNumber });
}
