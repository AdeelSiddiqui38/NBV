import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

const directorSchema = z.object({
  first: z.string(),
  last: z.string(),
  addr: z.string(),
  resident: z.enum(["yes", "no"]),
  role: z.string(),
});

const shareClassSchema = z.object({
  name: z.string(),
  qty: z.string(),
  par: z.string(),
  rights: z.string(),
  custom: z.string(),
});

const schema = z.object({
  nameType: z.enum(["", "named", "numbered"]),
  corpName: z.string(),
  altName1: z.string(),
  altName2: z.string(),
  altName3: z.string(),
  legalEnding: z.string(),
  nuansNumber: z.string(),
  nuansDate: z.string(),
  bizActivity: z.string(),
  regStreet: z.string(),
  regSuite: z.string(),
  regCity: z.string(),
  regPostal: z.string(),
  sameAddress: z.boolean(),
  recStreet: z.string(),
  recCity: z.string(),
  recPostal: z.string(),
  directors: z.array(directorSchema),
  shares: z.array(shareClassSchema),
  shareRestrictions: z.string(),
  bizRestrictions: z.string(),
  otherProvisions: z.string(),
  incFirstName: z.string(),
  incLastName: z.string(),
  incAddress: z.string(),
  incPhone: z.string(),
  incEmail: z.string(),
  signDate: z.string(),
  fiscalYearEnd: z.string(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const c = await db.case.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const d = parsed.data;
  const legalName =
    d.nameType === "numbered" ? null : [d.corpName, d.legalEnding].filter(Boolean).join(" ").trim() || null;

  const corp = await db.corporateEntity.upsert({
    where: { caseId: c.id },
    create: {
      caseId: c.id,
      legalName,
      jurisdiction: "Alberta",
      nuansRef: d.nuansNumber || null,
      incorporationData: d,
    },
    update: {
      legalName,
      jurisdiction: "Alberta",
      nuansRef: d.nuansNumber || null,
      incorporationData: d,
    },
  });

  await logActivity(user, "corp", "incorporation-form-saved", `${c.fileNumber}: Alberta incorporation form saved`, corp.id);
  return NextResponse.json({ ok: true });
}
