import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

function csv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// CRA Year-End Package — CSV bundle for the accountant.
// GET /api/reports/year-end?year=2026&part=invoices|payments|gst|expenses|trust|summary
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "ACCOUNTANT"].includes(user.role))
    return NextResponse.json({ error: "Year-end exports require Admin/Accountant role." }, { status: 403 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()));
  const part = url.searchParams.get("part") ?? "summary";
  const from = new Date(`${year}-01-01`);
  const to = new Date(`${year + 1}-01-01`);

  let filename = `NBV-${year}-${part}.csv`;
  let body = "";

  if (part === "invoices") {
    const invoices = await db.invoice.findMany({
      where: { issueDate: { gte: from, lt: to }, status: { not: "VOID" } },
      include: { client: true, case: true, lines: true },
      orderBy: { issueDate: "asc" },
    });
    body = csv([
      ["Invoice #", "Date", "Client", "Client #", "File #", "Milestone", "Fees (net)", "Disbursements", "GST", "Total", "Status"],
      ...invoices.map((i) => {
        const fees = i.lines.filter((l) => l.kind === "FEE").reduce((s, l) => s + l.amount, 0);
        const disb = i.lines.filter((l) => l.kind === "DISBURSEMENT").reduce((s, l) => s + l.amount, 0);
        return [
          i.number, i.issueDate.toISOString().slice(0, 10),
          `${i.client.firstName} ${i.client.lastName}`, i.client.clientNumber,
          i.case?.fileNumber ?? "", i.milestone ?? "",
          fees.toFixed(2), disb.toFixed(2), (Math.round(fees * i.taxRate * 100) / 100).toFixed(2),
          i.total.toFixed(2), i.status,
        ];
      }),
    ]);
  } else if (part === "payments") {
    const payments = await db.payment.findMany({
      where: { date: { gte: from, lt: to } },
      include: { invoice: { include: { client: true } } },
      orderBy: { date: "asc" },
    });
    body = csv([
      ["Date", "Invoice #", "Client", "Amount", "Method", "Reference"],
      ...payments.map((p) => [
        p.date.toISOString().slice(0, 10), p.invoice.number,
        `${p.invoice.client.firstName} ${p.invoice.client.lastName}`,
        p.amount.toFixed(2), p.method ?? "", p.reference ?? "",
      ]),
    ]);
  } else if (part === "gst") {
    const invoices = await db.invoice.findMany({
      where: { issueDate: { gte: from, lt: to }, status: { not: "VOID" } },
      include: { lines: true },
      orderBy: { issueDate: "asc" },
    });
    const byQuarter = new Map<string, { fees: number; gst: number }>();
    for (const i of invoices) {
      const q = `Q${Math.floor(i.issueDate.getMonth() / 3) + 1}`;
      const fees = i.lines.filter((l) => l.kind === "FEE").reduce((s, l) => s + l.amount, 0);
      const e = byQuarter.get(q) ?? { fees: 0, gst: 0 };
      e.fees += fees;
      e.gst += Math.round(fees * i.taxRate * 100) / 100;
      byQuarter.set(q, e);
    }
    const expenses = await db.expense.findMany({ where: { date: { gte: from, lt: to } } });
    const itcs = expenses.reduce((s, e) => s + e.gstHstItc, 0);
    body = csv([
      ["Quarter", "Fee revenue (net)", "GST/HST collected"],
      ...Array.from(byQuarter.entries()).map(([q, v]) => [q, v.fees.toFixed(2), v.gst.toFixed(2)]),
      [],
      ["Total ITCs on expenses (year)", itcs.toFixed(2)],
      ["Note", "Net GST remittance = collected − ITCs; confirm with accountant"],
    ]);
  } else if (part === "expenses") {
    const expenses = await db.expense.findMany({
      where: { date: { gte: from, lt: to } },
      include: { category: true },
      orderBy: { date: "asc" },
    });
    body = csv([
      ["Date", "Vendor", "Category", "GIFI", "Amount", "GST ITC", "Status", "Campaign", "Source"],
      ...expenses.map((e) => [
        e.date.toISOString().slice(0, 10), e.vendor, e.category.name, e.category.gifiCode ?? "",
        e.amount.toFixed(2), e.gstHstItc.toFixed(2), e.status, e.campaign ?? "", e.source,
      ]),
    ]);
  } else if (part === "trust") {
    const txns = await db.trustTransaction.findMany({ where: { date: { lt: to } }, include: { client: true } });
    const perClient = new Map<string, { name: string; bal: number }>();
    for (const t of txns) {
      const e = perClient.get(t.clientId) ?? { name: `${t.client.firstName} ${t.client.lastName} (${t.client.clientNumber})`, bal: 0 };
      e.bal += t.type === "DEPOSIT" ? t.amount : -t.amount;
      perClient.set(t.clientId, e);
    }
    const rows = Array.from(perClient.values()).filter((c) => Math.abs(c.bal) > 0.005);
    body = csv([
      [`Unearned trust balances as at ${year}-12-31 (LIABILITY — not income)`],
      ["Client", "Balance"],
      ...rows.map((c) => [c.name, c.bal.toFixed(2)]),
      ["TOTAL", rows.reduce((s, c) => s + c.bal, 0).toFixed(2)],
    ]);
  } else {
    // summary
    const invoices = await db.invoice.findMany({ where: { issueDate: { gte: from, lt: to }, status: { not: "VOID" } }, include: { lines: true } });
    const payments = await db.payment.findMany({ where: { date: { gte: from, lt: to } } });
    const expenses = await db.expense.findMany({ where: { date: { gte: from, lt: to } } });
    const fees = invoices.flatMap((i) => i.lines).filter((l) => l.kind === "FEE").reduce((s, l) => s + l.amount, 0);
    const disb = invoices.flatMap((i) => i.lines).filter((l) => l.kind === "DISBURSEMENT").reduce((s, l) => s + l.amount, 0);
    const gstCollected = invoices.reduce((s, i) => s + Math.round(i.lines.filter((l) => l.kind === "FEE").reduce((x, l) => x + l.amount, 0) * i.taxRate * 100) / 100, 0);
    body = csv([
      [`NBV Year-End Summary ${year} — for T2/GIFI preparation (review with accountant)`],
      [],
      ["Fee revenue invoiced (net of GST)", fees.toFixed(2)],
      ["Disbursements passed through", disb.toFixed(2)],
      ["GST/HST collected", gstCollected.toFixed(2)],
      ["Cash collected (payments)", payments.reduce((s, p) => s + p.amount, 0).toFixed(2)],
      ["Operating expenses recorded", expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)],
      ["GST ITCs on expenses", expenses.reduce((s, e) => s + e.gstHstItc, 0).toFixed(2)],
      [],
      ["Parts available", "invoices, payments, gst, expenses, trust, summary"],
    ]);
  }

  await logActivity(user, "report", "year_end_export", `${year} ${part}.csv`);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
