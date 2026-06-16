import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { newDoc, pdfToBuffer, header, money, row } from "@/lib/pdf";

// Detailed Client Account Reconciliation Statement (CICC) — as-at month end.
// GET /api/reports/trust-reconciliation?month=2026-06&bank=27800  (bank = statement balance to compare)
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RCIC", "ACCOUNTANT"].includes(user.role))
    return NextResponse.json({ error: "Trust reports require Admin/RCIC/Accountant role." }, { status: 403 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const bankParam = url.searchParams.get("bank");
  const asAt = new Date(`${month}-01`);
  asAt.setMonth(asAt.getMonth() + 1); // end of month boundary (exclusive)

  const txns = await db.trustTransaction.findMany({
    where: { date: { lt: asAt } },
    include: { client: true },
    orderBy: { date: "asc" },
  });

  const perClient = new Map<string, { name: string; number: string; bal: number; txns: typeof txns }>();
  for (const t of txns) {
    const key = t.clientId;
    if (!perClient.has(key))
      perClient.set(key, { name: `${t.client.firstName} ${t.client.lastName}`, number: t.client.clientNumber, bal: 0, txns: [] as any });
    const e = perClient.get(key)!;
    e.bal += t.type === "DEPOSIT" ? t.amount : -t.amount;
    e.txns.push(t);
  }
  const clients = Array.from(perClient.values()).filter((c) => Math.abs(c.bal) > 0.005 || c.txns.length > 0).sort((a, b) => b.bal - a.bal);
  const total = Math.round(clients.reduce((s, c) => s + c.bal, 0) * 100) / 100;
  const bank = bankParam ? parseFloat(bankParam) : null;
  const variance = bank !== null ? Math.round((bank - total) * 100) / 100 : null;

  const doc = newDoc();
  header(doc, `Detailed Client Account Reconciliation Statement — ${month}`);
  doc.fontSize(9).fillColor("#444").font("Helvetica")
    .text(`Prepared by: ${user.name} · Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")} · Includes all transactions to end of ${month}.`);
  doc.moveDown(1);

  row(doc, [
    { text: "CLIENT", x: 50, w: 230, bold: true },
    { text: "CLIENT #", x: 285, w: 130, bold: true },
    { text: "TRUST BALANCE", x: 430, w: 132, align: "right", bold: true },
  ], { gray: true });
  for (const c of clients) {
    if (doc.y > 680) doc.addPage();
    row(doc, [
      { text: c.name, x: 50, w: 230 },
      { text: c.number, x: 285, w: 130 },
      { text: money(c.bal), x: 430, w: 132, align: "right" },
    ]);
  }
  doc.moveDown(0.3);
  row(doc, [
    { text: "TOTAL CLIENT BALANCES", x: 50, w: 360, bold: true },
    { text: money(total), x: 430, w: 132, align: "right", bold: true },
  ], { gray: true });

  if (bank !== null) {
    row(doc, [
      { text: "BANK STATEMENT BALANCE (entered)", x: 50, w: 360 },
      { text: money(bank), x: 430, w: 132, align: "right" },
    ]);
    row(doc, [
      { text: variance === 0 ? "VARIANCE — RECONCILED ✓" : "VARIANCE — INVESTIGATE ⚠", x: 50, w: 360, bold: true },
      { text: money(variance!), x: 430, w: 132, align: "right", bold: true },
    ]);
  } else {
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor("#888").text("No bank balance entered — pass ?bank=<amount> to compare against the trust account statement.");
  }

  doc.moveDown(1.5);
  doc.fontSize(8).fillColor("#888")
    .text("Per CICC Client Account requirements: per-client balances must equal the designated Client Account bank balance. Negative balances are system-blocked. Signature: ____________________  (Responsible RCIC)", 50, doc.y, { width: 512 });

  const buf = await pdfToBuffer(doc);
  await logActivity(user, "trust", "reconciliation_generated", `${month}: ${clients.length} clients, total ${total}${variance !== null ? `, variance ${variance}` : ""}`);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Trust-Reconciliation-${month}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
