import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: { id: string; memberId: string } };

// ─── DELETE /api/clients/[id]/family/[memberId] ───────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await prisma.familyMember.findFirst({
    where: { id: params.memberId, clientId: params.id },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.familyMember.delete({ where: { id: params.memberId } });

  // Recalculate family size
  const remaining = await prisma.familyMember.count({ where: { clientId: params.id } });
  await prisma.client.update({
    where: { id: params.id },
    data: { familySize: remaining + 1 },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "removed_family_member",
      entity: "FamilyMember",
      entityId: params.memberId,
      detail: `Removed ${member.firstName} ${member.lastName} from client ${params.id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
