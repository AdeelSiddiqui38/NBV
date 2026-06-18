import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: { id: string } };

// ─── GET /api/clients/[id]/family ─────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession(_req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.familyMember.findMany({
    where: { clientId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

// ─── POST /api/clients/[id]/family ───────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json();
  const { firstName, lastName, relationship, dateOfBirth, biometrics, medical, passportReady } = body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 422 });
  }

  // Age-based auto-rules
  let bioRequired = Boolean(biometrics);
  const dob = dateOfBirth ? new Date(dateOfBirth) : null;
  const ageNow = dob
    ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // Biometrics required for ages 14–79
  if (ageNow !== null) {
    bioRequired = ageNow >= 14 && ageNow <= 79;
  }

  const member = await prisma.familyMember.create({
    data: {
      clientId: params.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      relationship: relationship ?? "OTHER",
      dateOfBirth: dateOfBirth ?? null,
      biometrics: bioRequired,
      medical: Boolean(medical),
      passportReady: Boolean(passportReady),
    },
  });

  // Update family size on the parent client
  const count = await prisma.familyMember.count({ where: { clientId: params.id } });
  await prisma.client.update({
    where: { id: params.id },
    data: { familySize: count + 1 }, // +1 for the principal applicant
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "added_family_member",
      entity: "FamilyMember",
      entityId: member.id,
      detail: `Added ${member.firstName} ${member.lastName} (${member.relationship}) to client ${params.id}`,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
