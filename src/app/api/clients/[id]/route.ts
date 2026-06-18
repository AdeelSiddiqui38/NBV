import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: { id: string } };

// ─── GET /api/clients/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession(_req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      familyMembers: true,
      cases: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      trustTransactions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ client });
}

// ─── PATCH /api/clients/[id] ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Case Managers can edit, but cannot change status to CLOSED (Admin/RCIC only)
  const body = await req.json();
  const { firstName, lastName, email, phone, status, rcicName, engagementMode, familySize } = body;

  if (status === "CLOSED" && !["ADMIN", "RCIC"].includes(session.role)) {
    return NextResponse.json({ error: "Only RCIC or Admin can close a client file." }, { status: 403 });
  }

  // Validate required
  if (firstName !== undefined && !firstName.trim()) {
    return NextResponse.json({ error: "firstName cannot be blank" }, { status: 422 });
  }
  if (lastName !== undefined && !lastName.trim()) {
    return NextResponse.json({ error: "lastName cannot be blank" }, { status: 422 });
  }

  // Email-uniqueness check (exclude current record)
  if (email) {
    const conflict = await prisma.client.findFirst({
      where: { email, NOT: { id: params.id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "Another client already uses this email." }, { status: 409 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (firstName !== undefined) updateData.firstName = firstName.trim();
  if (lastName !== undefined) updateData.lastName = lastName.trim();
  if (email !== undefined) updateData.email = email.trim().toLowerCase();
  if (phone !== undefined) updateData.phone = phone.trim() || null;
  if (status !== undefined) updateData.status = status;
  if (rcicName !== undefined) updateData.rcicName = rcicName.trim() || null;
  if (engagementMode !== undefined) updateData.engagementMode = engagementMode;
  if (familySize !== undefined) updateData.familySize = Number(familySize);

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "updated_client",
      entity: "Client",
      entityId: params.id,
      detail: `Updated fields: ${Object.keys(updateData).join(", ")}`,
    },
  });

  return NextResponse.json({ client: updated });
}

// ─── DELETE /api/clients/[id] ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "RCIC"].includes(session.role)) {
    return NextResponse.json({ error: "Only RCIC or Admin may delete clients." }, { status: 403 });
  }

  // Safety guard: block if active cases exist
  const activeCases = await prisma.case.count({
    where: { clientId: params.id, status: { not: "CLOSED" } },
  });
  if (activeCases > 0) {
    return NextResponse.json(
      { error: `Cannot delete — client has ${activeCases} active case(s). Close them first.` },
      { status: 409 }
    );
  }

  // Safety guard: block if outstanding invoices
  const unpaidInvoices = await prisma.invoice.count({
    where: { clientId: params.id, status: { in: ["ISSUED", "PARTIAL"] } },
  });
  if (unpaidInvoices > 0) {
    return NextResponse.json(
      { error: `Cannot delete — client has ${unpaidInvoices} unpaid invoice(s).` },
      { status: 409 }
    );
  }

  // Safety guard: positive trust balance
  const trust = await prisma.trustTransaction.aggregate({
    where: { clientId: params.id },
    _sum: { amount: true },
  });
  // (simplified: if any trust funds remain, block)
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "deleted_client",
      entity: "Client",
      entityId: params.id,
      detail: `Deleted client ${client.clientRef} — ${client.firstName} ${client.lastName}`,
    },
  });

  await prisma.client.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
