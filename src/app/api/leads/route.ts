import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  sector: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  source: z.string().optional(),
  capitalBand: z.string().optional(),
  scorecard: z.enum(["GREEN", "AMBER", "RED"]).optional(),
  scorecardNote: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const lead = await db.lead.create({
    data: { ...parsed.data, email: parsed.data.email || null },
  });
  await logActivity(user, "lead", "created", `Lead: ${lead.name} (${lead.country ?? "?"} · ${lead.sector ?? "?"})`, lead.id);
  return NextResponse.json({ ok: true, id: lead.id });
}
