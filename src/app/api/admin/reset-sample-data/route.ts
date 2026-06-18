import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, logActivity } from "@/lib/auth";

// One-time destructive reset: wipes all Leads/Quotes, Clients/Cases (and everything
// that hangs off them), and Expenses, so the CRM can be repopulated with real data.
// Users, ExpenseCategory definitions, and login/audit history are left untouched.
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE ALL SAMPLE DATA") {
    return NextResponse.json(
      { error: 'Send { "confirm": "DELETE ALL SAMPLE DATA" } in the request body to proceed.' },
      { status: 400 }
    );
  }

  const counts = await db.$transaction(async (tx) => {
    const quoteAdjustments = await tx.quoteAdjustment.deleteMany();
    const feeQuotes = await tx.feeQuote.deleteMany();
    const leads = await tx.lead.deleteMany();

    const plannedHires = await tx.plannedHire.deleteMany();
    const businessProposals = await tx.businessProposal.deleteMany();

    const costSplits = await tx.costSplit.deleteMany();
    const distributions = await tx.distribution.deleteMany();
    const partnershipDeals = await tx.partnershipDeal.deleteMany();
    const shareholders = await tx.shareholder.deleteMany();
    const capitalTransactions = await tx.capitalTransaction.deleteMany();
    const bankAccounts = await tx.bankAccount.deleteMany();
    const corporateEntities = await tx.corporateEntity.deleteMany();

    const employerPortalRecords = await tx.employerPortalRecord.deleteMany();
    const workPermitRecords = await tx.workPermitRecord.deleteMany();

    const documentItems = await tx.documentItem.deleteMany();
    const folders = await tx.folder.deleteMany();
    const tasks = await tx.task.deleteMany({ where: { caseId: { not: null } } });
    const deadlines = await tx.deadline.deleteMany();
    const caseStageLogs = await tx.caseStageLog.deleteMany();

    const invoiceLines = await tx.invoiceLine.deleteMany();
    const payments = await tx.payment.deleteMany();
    const invoices = await tx.invoice.deleteMany();

    const trustTransactions = await tx.trustTransaction.deleteMany();
    const contactLogEntries = await tx.contactLogEntry.deleteMany();
    const familyMembers = await tx.familyMember.deleteMany();

    const cases = await tx.case.deleteMany();
    const clients = await tx.client.deleteMany();

    const expenses = await tx.expense.deleteMany();

    return {
      quoteAdjustments: quoteAdjustments.count,
      feeQuotes: feeQuotes.count,
      leads: leads.count,
      plannedHires: plannedHires.count,
      businessProposals: businessProposals.count,
      costSplits: costSplits.count,
      distributions: distributions.count,
      partnershipDeals: partnershipDeals.count,
      shareholders: shareholders.count,
      capitalTransactions: capitalTransactions.count,
      bankAccounts: bankAccounts.count,
      corporateEntities: corporateEntities.count,
      employerPortalRecords: employerPortalRecords.count,
      workPermitRecords: workPermitRecords.count,
      documentItems: documentItems.count,
      folders: folders.count,
      tasks: tasks.count,
      deadlines: deadlines.count,
      caseStageLogs: caseStageLogs.count,
      invoiceLines: invoiceLines.count,
      payments: payments.count,
      invoices: invoices.count,
      trustTransactions: trustTransactions.count,
      contactLogEntries: contactLogEntries.count,
      familyMembers: familyMembers.count,
      cases: cases.count,
      clients: clients.count,
      expenses: expenses.count,
    };
  });

  await logActivity(me, "system", "reset_sample_data", JSON.stringify(counts));
  return NextResponse.json({ ok: true, deleted: counts });
}
