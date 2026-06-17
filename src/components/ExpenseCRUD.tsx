"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Expense = {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  gstHstItc: number;
  status: string;
  categoryId: string;
  campaign?: string | null;
  caseId?: string | null;
  billable: boolean;
};

type Category = {
  id: string;
  name: string;
};

export function AddExpenseButton({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    categoryId: categories[0]?.id || "",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    gstHstItc: "",
    status: "CONFIRMED",
    campaign: "",
    caseId: "",
    billable: false,
  });

  const handleCreate = async () => {
    if (!form.categoryId || !form.vendor || !form.amount) {
      setError("Category, vendor, and amount are required");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        gstHstItc: form.gstHstItc ? parseFloat(form.gstHstItc) : 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setForm({
        categoryId: categories[0]?.id || "",
        vendor: "",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        gstHstItc: "",
        status: "CONFIRMED",
        campaign: "",
        caseId: "",
        billable: false,
      });
      router.refresh();
    } else {
      setError(data.error || "Create failed");
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary px-4 py-2">
        ➕ Add Expense
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">Add New Expense</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor *</label>
                <input
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.vendor}
                  onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (CAD) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">GST/HST ITC</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.gstHstItc}
                  onChange={(e) => setForm((p) => ({ ...p, gstHstItc: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="INBOX">Inbox</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign</label>
                <input
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.campaign}
                  onChange={(e) => setForm((p) => ({ ...p, campaign: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.billable}
                    onChange={(e) => setForm((p) => ({ ...p, billable: e.target.checked }))}
                  />
                  <span className="text-xs font-semibold text-slate-600">Billable</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={busy}
                className="px-4 py-2 text-sm bg-navy text-white rounded font-semibold disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ExpenseCRUDButtons({ expense, categories }: { expense: Expense; categories: Category[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    categoryId: expense.categoryId,
    vendor: expense.vendor,
    date: new Date(expense.date).toISOString().split("T")[0],
    amount: expense.amount.toString(),
    gstHstItc: expense.gstHstItc.toString(),
    status: expense.status,
    campaign: expense.campaign || "",
    billable: expense.billable,
  });

  const handleSave = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        gstHstItc: form.gstHstItc ? parseFloat(form.gstHstItc) : 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setEditOpen(false);
      router.refresh();
    } else {
      setError(data.error || "Save failed");
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error || "Delete failed");
      setDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="flex gap-1">
        <button
          onClick={() => setEditOpen(true)}
          className="btn text-xs px-2 py-1 bg-blue-500 text-white"
        >
          ✏️
        </button>
        <button
          onClick={() => setDeleteConfirm(true)}
          className="btn text-xs px-2 py-1 bg-red-500 text-white"
        >
          🗑️
        </button>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">Edit Expense</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor</label>
                <input
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.vendor}
                  onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">GST/HST ITC</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.gstHstItc}
                  onChange={(e) => setForm((p) => ({ ...p, gstHstItc: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="INBOX">Inbox</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign</label>
                <input
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.campaign}
                  onChange={(e) => setForm((p) => ({ ...p, campaign: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.billable}
                    onChange={(e) => setForm((p) => ({ ...p, billable: e.target.checked }))}
                  />
                  <span className="text-xs font-semibold text-slate-600">Billable</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-4 py-2 text-sm bg-navy text-white rounded font-semibold disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-navy mb-4">Delete Expense?</h2>
            <p className="text-sm text-slate-600 mb-4">
              Delete {expense.vendor} — {new Date(expense.date).toLocaleDateString()}? This action cannot be undone.
            </p>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded font-semibold disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
