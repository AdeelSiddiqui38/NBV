import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

// Public lead intake, called directly from the browser on nextbridgeventures.ca/apply.
// Since this is called cross-origin from public JS, there's no secret to protect it with —
// trust instead comes from:
//  1. Cloudflare Turnstile token, verified server-side on every submission.
//  2. Honeypot field ("website2") — must arrive empty; bots that auto-fill every input get
//     a fake success response so they don't know they were caught.
//  3. Per-email rate limit — blocks rapid-fire / scripted flooding.
const ALLOWED_ORIGIN = "https://nextbridgeventures.ca";

const schema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(200),
  ventureName: z.string().min(1).max(200),
  websiteUrl: z.string().max(300).optional().or(z.literal("")),
  pitch: z.string().min(20).max(5000),
  turnstileToken: z.string().min(1),
  website2: z.string().optional().or(z.literal("")), // honeypot — real applicants never see/fill this
});

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }));
  const d = parsed.data;

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? "", response: d.turnstileToken }),
  });
  const verify = await verifyRes.json().catch(() => ({ success: false }));
  if (!verify.success) {
    return withCors(NextResponse.json({ error: "Verification failed — please try again." }, { status: 400 }));
  }

  // Honeypot tripped — pretend success so the bot moves on, but write nothing.
  if (d.website2 && d.website2.trim() !== "") {
    return withCors(NextResponse.json({ ok: true }));
  }

  const recent = await db.lead.count({
    where: { email: d.email, source: "Website — Apply Form", createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 3) {
    return withCors(NextResponse.json({ error: "Too many submissions from this email recently. Please try again later." }, { status: 429 }));
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

  return withCors(NextResponse.json({ ok: true, id: lead.id }));
}
