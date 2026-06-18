import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  netWorthBand: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  dateOfBirth: z.string().optional().nullable(),
});

// GET /api/clients — list all clients (admin only)
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const clients = await db.client.findMany({
    include: {
      familyMembers: true,
      cases: true,
      trustTxns: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

// POST /api/clients — create a new client (admin only)
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;

  // Generate unique client number (e.g., C-2026-001)
  const year = new Date().getFullYear();
  const count = await db.client.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const clientNumber = `C-${year}-${String(count + 1).padStart(3, "0")}`;

  const client = await db.client.create({
    data: {
      clientNumber,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email || null,
      phone: d.phone || null,
      country: d.country || null,
      maritalStatus: d.maritalStatus || null,
      source: d.source || null,
      netWorthBand: d.netWorthBand || null,
      status: d.status,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
    },
  });

  await logActivity(user, "client", "created", `${client.firstName} ${client.lastName} (${clientNumber})`, client.id);
  return NextResponse.json(client, { status: 201 });
}
