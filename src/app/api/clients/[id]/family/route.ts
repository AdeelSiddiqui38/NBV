import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";

const schema = z.object({
  relationship: z.enum(["SPOUSE", "COMMON_LAW", "CHILD", "PARENT", "OTHER"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(8),
  accompanying: z.boolean().default(true),
  citizenship: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  passportImageKey: z.string().optional(),
  passportImageMime: z.string().optional(),
  passportVerified: z.boolean().default(false),
  occupationOrGrade: z.string().optional(),
  priorRefusals: z.boolean().default(false),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  if (d.accompanying && !d.passportImageKey)
    return NextResponse.json(
      { error: "Accompanying family members require a scanned passport before they can be added." },
      { status: 400 }
    );

  const dob = new Date(d.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));

  // auto-rules
  const dependentEligible = d.relationship === "CHILD" ? age < 22 : null;
  const biometricsStatus = age >= 14 && age <= 79 ? "REQUIRED" : "EXEMPT";

  const member = await db.familyMember.create({
    data: {
      clientId: params.id,
      relationship: d.relationship,
      firstName: d.firstName,
      lastName: d.lastName,
      dateOfBirth: dob,
      accompanying: d.accompanying,
      citizenship: d.citizenship || null,
      passportNumber: d.passportNumber ? encryptField(d.passportNumber) : null,
      passportExpiry: d.passportExpiry ? new Date(d.passportExpiry) : null,
      passportImageKey: d.passportImageKey || null,
      passportImageMime: d.passportImageMime || null,
      passportVerified: d.passportVerified,
      occupationOrGrade: d.occupationOrGrade || null,
      priorRefusals: d.priorRefusals,
      dependentEligible,
      biometricsStatus,
      medicalStatus: d.accompanying ? "REQUIRED" : "NA",
    },
  });

  const warnings: string[] = [];
  if (d.relationship === "CHILD" && age >= 22)
    warnings.push(`${d.firstName} is ${age} — over the dependent-child age limit (22). Verify eligibility (dependent-condition exception only).`);
  if (d.relationship === "CHILD" && age >= 19)
    warnings.push(`${d.firstName} is ${age} — approaching/near age-22 lock. Monitor timeline.`);

  await logActivity(user, "family", "member_added", `${d.firstName} ${d.lastName} (${d.relationship}, ${age}y, ${d.accompanying ? "accompanying" : "not accompanying"})`, member.id);
  return NextResponse.json({ ok: true, id: member.id, warnings });
}
