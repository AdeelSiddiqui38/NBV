// Mailer: RESEND_API_KEY set -> sends via Resend. Otherwise logs to console + activity log (dev).
import { db } from "./db";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "NBV CRM <noreply@nextbridgeventures.ca>";

export async function sendMail(to: string, subject: string, body: string) {
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: MAIL_FROM, to, subject, text: body }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend send failed (${res.status}): ${errText}`);
    }
  } else {
    console.log(`\n━━━ MAIL to ${to} ━━━\n${subject}\n${body}\n━━━━━━━━━━━━━━━━━━━━\n`);
  }

  await db.activityLog.create({
    data: { actorName: "Mailer", entityType: "mail", action: "sent", detail: `to ${to}: ${subject}` },
  });
}
