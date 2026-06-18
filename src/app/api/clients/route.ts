import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateClientRef } from "@/lib/refs";

// ─── GET /api/clients ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    orderBy: { lastName: "asc" },
    include: {
      cases: {
        select: { id: true, caseRef: true, stage: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      trustTransactions: {
        select: { amount: true, type: true },
      },
      invoices: {
        where: { status: { in: ["ISSUED", "PARTIAL"] } },
        select: { amountDue: true, amountPaid: true },
      },
    },
  });

  const shaped = clients.map((c) => {
    // Trust balance = sum of credits - sum of debits
    const trustBalance = c.trustTransactions.reduce((sum, t) => {
      return t.type === "DEPOSIT" || t.type === "TRANSFER_FROM_OPERATING"
        ? sum + t.amount
        : sum - t.amount;
    }, 0);

    // Outstanding A/R = sum of (amountDue - amountPaid) on open invoices
    const outstandingAR = c.invoices.reduce(
      (sum, inv) => sum + (inv.amountDue - inv.amountPaid),
      0
    );

    return {
      id: c.id,
      clientRef: c.clientRef,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone ?? "",
      engagementMode: c.engagementMode,
      status: c.status,
      rcicName: c.rcicName ?? "",
      familySize: c.familySize ?? 1,
      createdAt: c.createdAt.toISOString(),
      trustBalance,
      outstandingAR,
      cases: c.cases,
    };
  });

  return NextResponse.json({ clients: shaped });
}

// ─── POST /api/clients ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only RCIC / Admin may create clients directly
  if (!["ADMIN", "RCIC"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, email, phone, engagementMode, status, rcicName, familySize } = body;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "firstName, lastName and email are required" }, { status: 422 });
  }

  // Duplicate e-mail check
  const existing = await prisma.client.findFirst({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A client with this email already exists" }, { status: 409 });
  }

  const clientRef = await generateClientRef();

  const client = await prisma.client.create({
    data: {
      clientRef,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() ?? null,
      engagementMode: engagementMode ?? "A",
      status: status ?? "ACTIVE",
      rcicName: rcicName?.trim() ?? null,
      familySize: familySize ?? 1,
      createdById: session.userId,
    },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "created_client",
      entity: "Client",
      entityId: client.id,
      detail: `Created client ${client.clientRef} — ${client.firstName} ${client.lastName}`,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
