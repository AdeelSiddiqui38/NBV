import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const schema = z.object({
  jobTitle: z.string().optional(),
  noc: z.string().optional(),
  teer: z.number().int().min(0).max(5).optional(),
  salary: z.number().positive().optional(),
  offerSubmitted: z.boolean().optional(),
  complianceFeePaid: z.boolean().optional(),
  aNumber: z.string().optional(),
});

// Record / update Employer Portal data (incl. the A-number that releases the gate)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const c = await db.case.findUnique({ where: { id: params.id }, include: { portal: true } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const data: any = {};
  if (d.jobTitle !== undefined) data.jobTitle = d.jobTitle;
  if (d.noc !== undefined) data.noc = d.noc;
  if (d.teer !== undefined) data.teer = d.teer;
  if (d.salary !== undefined) data.salary = d.salary;
  if (d.offerSubmitted) data.offerSubmittedAt = new Date();
  if (d.complianceFeePaid) data.complianceFeePaidAt = new Date();
  if (d.aNumber) data.aNumber = d.aNumber;

  const portal = c.portal
    ? await db.employerPortalRecord.update({ where: { caseId: c.id }, data })
    : await db.employerPortalRecord.create({ data: { caseId: c.id, enrolledAt: new Date(), ...data } });

  if (d.aNumber)
    await logActivity(user, "case", "a_number_recorded", `${c.fileNumber}: A-number ${d.aNumber} — WP gate released`, c.id);
  else
    await logActivity(user, "case", "portal_updated", `${c.fileNumber}: Employer Portal record updated`, c.id);

  const spouseOwpEligible = portal.teer !== null && portal.teer <= 1;
  return NextResponse.json({ ok: true, spouseOwpEligible });
}
