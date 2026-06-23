import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { familyMemberSchema, computeAutoFields, familyMemberWarnings } from "@/lib/familyMember";

// Edit an existing family member — e.g. correcting OCR misreads, or replacing an expired passport scan.
export async function PATCH(req: Request, { params }: { params: { id: string; memberId: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.familyMember.findUnique({ where: { id: params.memberId } });
  if (!existing || existing.clientId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = familyMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  const dob = new Date(d.dateOfBirth);
  const { age, dependentEligible, biometricsStatus, medicalStatus } = computeAutoFields(d.relationship, dob, d.accompanying);

  // Keep the previously attached scan unless a new one was provided.
  const passportImageKey = d.passportImageKey || existing.passportImageKey;
  const passportImageMime = d.passportImageMime || existing.passportImageMime;
  const passportVerified = d.passportImageKey ? d.passportVerified : existing.passportVerified;

  await db.familyMember.update({
    where: { id: existing.id },
    data: {
      relationship: d.relationship,
      firstName: d.firstName,
      lastName: d.lastName,
      dateOfBirth: dob,
      accompanying: d.accompanying,
      citizenship: d.citizenship || null,
      passportNumber: d.passportNumber ? encryptField(d.passportNumber) : null,
      passportExpiry: d.passportExpiry ? new Date(d.passportExpiry) : null,
      passportImageKey,
      passportImageMime,
      passportVerified,
      occupationOrGrade: d.occupationOrGrade || null,
      priorRefusals: d.priorRefusals,
      dependentEligible,
      biometricsStatus,
      medicalStatus,
    },
  });

  const warnings = familyMemberWarnings({
    relationship: d.relationship, accompanying: d.accompanying, hasScan: !!passportImageKey, firstName: d.firstName, age,
  });

  await logActivity(user, "family", "member_updated", `${d.firstName} ${d.lastName} (${d.relationship}, ${age}y, ${d.accompanying ? "accompanying" : "not accompanying"})`, existing.id);
  return NextResponse.json({ ok: true, warnings });
}
