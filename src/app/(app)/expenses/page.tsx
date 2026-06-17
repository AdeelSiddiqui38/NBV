import { db } from "@/lib/db";
import { fmtCad, fmtDate } from "@/lib/constants";
import { AddExpenseButton, ExpenseCRUDButtons } from "@/components/ExpenseCRUD";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await getSession();
  const isAccounting = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";

  const [expenses, categories] = await Promise.all([
    db.expense.findMany({ include: { category: true }, orderBy: { date: "desc" }, take: 30 }),
    db.expenseCategory.findMany({ include: { expenses: true } }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mtd = expenses.filter((e) => e.date >= monthStart).reduce((s, e) => s + e.amount, 0);
  const inbox = expenses.filter((e) => e.status === "INBOX");

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-navy">NBV Internal Expenses</h1>
        {isAccounting && <AddExpenseButton categories={categories} />}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card"><div className="text-xl font-extrabold text-navy">{fmtCad(mtd)}</div><div className="text-xs text-slate-500">This month</div></div>
        <div className="card"><div className="text-xl font-extrabold text-navy">{inbox.length}</div><div className="text-xs text-slate-500">Inbox — to confirm</div></div>
        <div className="card"><div className="text-xl font-extrabold text-navy">{categories.length}</div><div className="text-xs text-slate-500">Categories (GIFI-mapped)</div></div>
        <div className="card"><div className="text-xl font-extrabold text-navy">{fmtCad(expenses.reduce((s, e) => s + e.gstHstItc, 0))}</div><div className="text-xs text-slate-500">GST/HST ITCs tracked</div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">Recent expenses</h3>
          <table className="w-full text-sm">
            <thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Amount</th><th>ITC</th><th>Status</th>{isAccounting && <th>Actions</th>}</tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{fmtDate(e.date)}</td>
                  <td className="font-semibold text-xs">{e.vendor}</td>
                  <td className="text-xs">{e.category.name}</td>
                  <td className="font-semibold">{fmtCad(e.amount)}</td>
                  <td className="text-xs">{fmtCad(e.gstHstItc)}</td>
                  <td><span className={`pill text-xs ${e.status === "INBOX" ? "pill-amber" : "pill-green"}`}>{e.status}</span></td>
                  {isAccounting && (
                    <td>
                      <ExpenseCRUDButtons expense={e} categories={categories} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-3">By category — month-to-date vs budget</h3>
          {categories.map((cat) => {
            const catMtd = cat.expenses.filter((e) => e.date >= monthStart).reduce((s, e) => s + e.amount, 0);
            const pct = cat.monthlyBudget ? Math.min(100, Math.round((catMtd / cat.monthlyBudget) * 100)) : 0;
            return (
              <div key={cat.id} className="py-2 border-b border-slate-100 last:border-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold">{cat.name}</span>
                  <span>{fmtCad(catMtd)}{cat.monthlyBudget ? ` / ${fmtCad(cat.monthlyBudget)}` : ""}</span>
                </div>
                {cat.monthlyBudget && (
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-teal"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
