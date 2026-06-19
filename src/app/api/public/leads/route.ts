import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

// Public lead intake from nextbridgeventures.ca/apply. Not session-protected — instead:
//  1. Authorization: Bearer <CRM_INTAKE_KEY> — only the website's own server should know this.
//  2. Honeypot field ("website2") — must arrive empty; bots that auto-fill every input get
//     a fake success response so they don't know they were caught.
//  3. Per-email rate limit — blocks rapid-fire / scripted flooding.
const schema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(200),
  ventureName: z.string().min(1).max(200),
  websiteUrl: z.string().max(300).optional().or(z.literal("")),
  pitch: z.string().min(20).max(5000),
  website2: z.string().optional().or(z.literal("")), // honeypot — real applicants never see/fill this
});

export async function POST(req: Request) {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRM_INTAKE_KEY || key !== process.env.CRM_INTAKE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  // Honeypot tripped — pretend success so the bot moves on, but write nothing.
  if (d.website2 && d.website2.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const recent = await db.lead.count({
    where: { email: d.email, source: "Website — Apply Form", createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 3) {
    return NextResponse.json({ error: "Too many submissions from this email recently. Please try again later." }, { status: 429 });
  }

  const notes = [
    `Venture: ${d.ventureName}`,
    d.websiteUrl ? `Website: ${d.websiteUrl}` : null,
    "",
    "Pitch:",
    d.pitch,
  ].filter((l) => l !== null).join("\n");

  const lead = await db.lead.create({
    data: { name: d.name, email: d.email, source: "Website — Apply Form", notes },
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
