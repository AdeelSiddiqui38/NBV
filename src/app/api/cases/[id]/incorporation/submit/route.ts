import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildIncorporationPackage, IncorporationData } from "@/lib/incorporationTypes";

const schema = z.object({
  agentEmail: z.string().email(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const c = await db.case.findUnique({ where: { id: params.id }, include: { corp: true } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!c.corp?.incorporationData) return NextResponse.json({ error: "Save the incorporation form before submitting." }, { status: 422 });

  const data = c.corp.incorporationData as unknown as IncorporationData;
  const pkg = buildIncorporationPackage(data, c.fileNumber);
  const corpName = data.nameType === "numbered" ? "Numbered Company" : `${data.corpName} ${data.legalEnding}`.trim();

  await sendMail(
    parsed.data.agentEmail,
    `Alberta Incorporation Filing Request — ${corpName} (${c.fileNumber})`,
    `A new Alberta Articles of Incorporation filing is ready for submission.\n\n${pkg}`
  );

  await db.corporateEntity.update({
    where: { id: c.corp.id },
    data: { incorporationSubmittedAt: new Date(), incorporationSubmittedTo: parsed.data.agentEmail },
  });

  await logActivity(user, "corp", "incorporation-submitted", `${c.fileNumber}: incorporation package sent to registry agent ${parsed.data.agentEmail}`, c.corp.id);
  return NextResponse.json({ ok: true });
}
