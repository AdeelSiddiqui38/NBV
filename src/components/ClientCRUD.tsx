"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  maritalStatus?: string | null;
  source?: string | null;
  netWorthBand?: string | null;
  status?: string | null;
  dateOfBirth?: string | null;
};

export function ClientCRUDButtons({ client }: { client: Client }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email || "",
    phone: client.phone || "",
    country: client.country || "",
    maritalStatus: client.maritalStatus || "",
    source: client.source || "",
    netWorthBand: client.netWorthBand || "",
    status: client.status || "ACTIVE",
  });

  const handleSave = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.push("/clients");
      router.refresh();
    } else {
      setError(data.error || "Delete failed");
      setDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button onClick={() => setEditOpen(true)} className="btn text-xs px-3 py-1.5 bg-blue-500 text-white">
          ✏️ Edit
        </button>
        <button onClick={() => setDeleteConfirm(true)} className="btn text-xs px-3 py-1.5 bg-red-500 text-white">
          🗑️ Delete
        </button>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">
              Edit Client — {client.firstName} {client.lastName}
            </h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["country", "Country"],
                ["maritalStatus", "Marital Status"],
                ["source", "Source / Referral"],
                ["netWorthBand", "Net Worth Band"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    value={(form as Record<string, string>)[k]}
                    onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-navy mb-4">Delete Client?</h2>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete {client.firstName} {client.lastName}? This action cannot be undone.
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

// Add New Client Component
export function AddClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    maritalStatus: "",
    source: "",
    netWorthBand: "",
  });
  const fields: Array<[keyof typeof form, string, boolean]> = [
    ["firstName", "First Name", true],
    ["lastName", "Last Name", true],
    ["email", "Email", false],
    ["phone", "Phone", false],
    ["country", "Country", false],
    ["maritalStatus", "Marital Status", false],
    ["source", "Source / Referral", false],
    ["netWorthBand", "Net Worth Band", false],
  ];

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        maritalStatus: "",
        source: "",
        netWorthBand: "",
      });
      router.refresh();
    } else {
      setError(data.error || "Create failed");
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary px-4 py-2 mb-5">
        ➕ Add New Client
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">Add New Client</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              {fields.map(([k, label, required]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {label} {required ? "*" : ""}
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    value={form[k]}
                    onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                  />
                </div>
              ))}
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
                {busy ? "Creating…" : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
