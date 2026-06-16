import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";
import { newDoc, pdfToBuffer, header, money, row, NBV } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "PLAN_WRITER") return NextResponse.json({ error: "No access" }, { status: 403 });

  const inv = await db.invoice.findUnique({
    where: { id: params.id },
    include: { client: true, case: true, lines: true, payments: { orderBy: { date: "asc" } } },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.round((inv.total - paid) * 100) / 100;
  const feePortion = inv.lines.filter((l) => l.kind === "FEE").reduce((s, l) => s + l.amount, 0);
  const gst = Math.round(feePortion * inv.taxRate * 100) / 100;

  const doc = newDoc();
  header(doc, balance <= 0 ? `RECEIPT — ${inv.number}` : `INVOICE ${inv.number}`);

  // Bill-to block
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#222").text("BILL TO");
  doc.font("Helvetica").text(`${inv.client.firstName} ${inv.client.lastName} (${inv.client.clientNumber})`);
  if (inv.case) doc.text(`File: ${inv.case.fileNumber}${inv.milestone ? ` · ${inv.milestone}` : ""}`);
  doc.text(`Issued: ${inv.issueDate.toISOString().slice(0, 10)}${inv.dueDate ? ` · Due: ${inv.dueDate.toISOString().slice(0, 10)}` : ""}`);
  doc.moveDown(1);

  // Lines table
  row(doc, [
    { text: "DESCRIPTION", x: 50, w: 330, bold: true },
    { text: "TYPE", x: 385, w: 80, bold: true },
    { text: "AMOUNT", x: 470, w: 92, align: "right", bold: true },
  ], { gray: true });
  for (const l of inv.lines) {
    row(doc, [
      { text: l.description, x: 50, w: 330 },
      { text: l.kind === "FEE" ? "Professional fee" : "Disbursement", x: 385, w: 80 },
      { text: money(l.amount), x: 470, w: 92, align: "right" },
    ]);
  }
  doc.moveDown(0.5);
  row(doc, [{ text: "Subtotal", x: 385, w: 80 }, { text: money(inv.subtotal), x: 470, w: 92, align: "right" }]);
  row(doc, [{ text: `GST (${(inv.taxRate * 100).toFixed(0)}% on fees)`, x: 385, w: 80 }, { text: money(gst), x: 470, w: 92, align: "right" }]);
  row(doc, [{ text: "TOTAL", x: 385, w: 80, bold: true }, { text: money(inv.total), x: 470, w: 92, align: "right", bold: true }]);

  if (inv.payments.length) {
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica-Bold").text("PAYMENTS RECEIVED", 50);
    for (const p of inv.payments) {
      row(doc, [
        { text: `${p.date.toISOString().slice(0, 10)} · ${p.method ?? "—"}${p.reference ? ` · ref ${p.reference}` : ""}`, x: 50, w: 330 },
        { text: `−${money(p.amount)}`, x: 470, w: 92, align: "right" },
      ]);
    }
    row(doc, [
      { text: balance <= 0 ? "PAID IN FULL" : "BALANCE DUE", x: 385, w: 80, bold: true },
      { text: money(Math.max(balance, 0)), x: 470, w: 92, align: "right", bold: true },
    ]);
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor("#888").font("Helvetica")
    .text(`${NBV.gstNo} · Disbursements are charged at cost without GST. Trust funds are held in a designated Client Account per CICC regulations.`, 50, doc.y, { width: 512 });

  const buf = await pdfToBuffer(doc);
  await logActivity(user, "invoice", "pdf_generated", `${inv.number} PDF downloaded`, inv.id);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
