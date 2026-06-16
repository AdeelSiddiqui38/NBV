// PDF generation helpers (pdfkit) — invoices, receipts, reports.
import PDFDocument from "pdfkit";

export const NBV = {
  name: "Next Bridge Ventures",
  tagline: "C11 Business Immigration Consultancy",
  address: "Calgary, Alberta, Canada",
  web: "www.nextbridgeventures.ca",
  gstNo: "GST/HST # 78432 1907 RT0001", // placeholder — set real number in Settings
};

export function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export function newDoc(): PDFKit.PDFDocument {
  return new PDFDocument({ size: "LETTER", margin: 50 });
}

export function header(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(18).fillColor("#0f2a43").font("Helvetica-Bold").text(NBV.name);
  doc.fontSize(9).fillColor("#666").font("Helvetica").text(`${NBV.tagline} · ${NBV.address} · ${NBV.web}`);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#0e9f8a").lineWidth(2).stroke();
  doc.moveDown(0.6);
  doc.fontSize(14).fillColor("#0f2a43").font("Helvetica-Bold").text(title);
  doc.moveDown(0.5);
}

export function money(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
}

export function row(
  doc: PDFKit.PDFDocument,
  cols: { text: string; x: number; w: number; align?: "left" | "right"; bold?: boolean }[],
  opts?: { gray?: boolean }
) {
  const y = doc.y;
  if (opts?.gray) {
    doc.rect(50, y - 2, 512, 16).fillColor("#f4f6f9").fill();
  }
  for (const c of cols) {
    doc
      .fontSize(9)
      .fillColor("#222")
      .font(c.bold ? "Helvetica-Bold" : "Helvetica")
      .text(c.text, c.x, y, { width: c.w, align: c.align ?? "left" });
  }
  doc.y = y + 16;
  doc.x = 50;
}
