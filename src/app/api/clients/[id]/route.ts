import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  netWorthBand: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  dateOfBirth: z.string().optional().nullable(),
});

// PATCH /api/clients/[id] — update a client (admin only)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const client = await db.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;

  const updated = await db.client.update({
    where: { id: params.id },
    data: {
      ...(d.firstName && { firstName: d.firstName }),
      ...(d.lastName && { lastName: d.lastName }),
      ...(d.email !== undefined && { email: d.email }),
      ...(d.phone !== undefined && { phone: d.phone }),
      ...(d.country !== undefined && { country: d.country }),
      ...(d.maritalStatus !== undefined && { maritalStatus: d.maritalStatus }),
      ...(d.source !== undefined && { source: d.source }),
      ...(d.netWorthBand !== undefined && { netWorthBand: d.netWorthBand }),
      ...(d.status && { status: d.status }),
      ...(d.dateOfBirth !== undefined && { dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null }),
    },
  });

  await logActivity(user, "client", "updated", `${updated.firstName} ${updated.lastName}`, updated.id);
  return NextResponse.json(updated);
}

// DELETE /api/clients/[id] — delete a client (admin only)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const client = await db.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Check if client has active cases
  const activeCases = await db.case.count({
    where: { clientId: params.id, status: { not: "CLOSED" } },
  });
  if (activeCases > 0) {
    return NextResponse.json({ error: "Cannot delete client with active cases" }, { status: 400 });
  }

  await db.client.delete({ where: { id: params.id } });
  await logActivity(user, "client", "deleted", `${client.firstName} ${client.lastName}`, params.id);
  return NextResponse.json({ ok: true });
}
