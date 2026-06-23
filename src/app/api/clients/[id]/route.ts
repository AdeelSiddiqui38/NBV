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
  passportExpiry: z.string().optional().nullable(),
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
      ...(d.passportExpiry !== undefined && { passportExpiry: d.passportExpiry ? new Date(d.passportExpiry) : null }),
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

  // A client with any case (open or closed) carries real case history — archive instead of deleting.
  const caseCount = await db.case.count({ where: { clientId: params.id } });
  if (caseCount > 0) {
    return NextResponse.json(
      { error: "This client has case history and can't be permanently deleted. Set status to Archived instead — it hides them from active lists while preserving records." },
      { status: 400 }
    );
  }

  try {
    await db.$transaction([
      db.familyMember.deleteMany({ where: { clientId: params.id } }),
      db.contactLogEntry.deleteMany({ where: { clientId: params.id } }),
      db.trustTransaction.deleteMany({ where: { clientId: params.id } }),
      db.payment.deleteMany({ where: { invoice: { clientId: params.id } } }),
      db.invoiceLine.deleteMany({ where: { invoice: { clientId: params.id } } }),
      db.invoice.deleteMany({ where: { clientId: params.id } }),
      db.lead.updateMany({ where: { clientId: params.id }, data: { clientId: null } }),
      db.client.delete({ where: { id: params.id } }),
    ]);
  } catch {
    return NextResponse.json({ error: "This client is still referenced by other records and can't be deleted." }, { status: 409 });
  }

  await logActivity(user, "client", "deleted", `${client.firstName} ${client.lastName}`, params.id);
  return NextResponse.json({ ok: true });
}
