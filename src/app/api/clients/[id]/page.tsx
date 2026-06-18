"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Users,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  ChevronRight,
  Phone,
  Mail,
  CreditCard,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FamilyMember {
  id: string;
  relationship: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  biometrics: boolean;
  medical: boolean;
  passportReady: boolean;
}

interface Invoice {
  id: string;
  invoiceRef: string;
  milestoneLabel: string | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  createdAt: string;
}

interface TrustTx {
  id: string;
  type: string;
  amount: number;
  memo: string;
  createdAt: string;
}

interface Case {
  id: string;
  caseRef: string;
  stage: string;
  status: string;
}

interface ClientDetail {
  id: string;
  clientRef: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  engagementMode: "A" | "B" | "C";
  status: "ACTIVE" | "INACTIVE" | "CLOSED";
  rcicName: string;
  familySize: number;
  createdAt: string;
  familyMembers: FamilyMember[];
  invoices: Invoice[];
  trustTransactions: TrustTx[];
  cases: Case[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  onSave,
  type = "text",
  options,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  type?: string;
  options?: { value: string; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="group flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          {options ? (
            <select
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <button onClick={save} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Check size={14} />
          </button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-800">{value || <span className="text-slate-400 italic">Not set</span>}</span>
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded"
            title={`Edit ${label}`}
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Family Member Modal ──────────────────────────────────────────────────

function AddFamilyModal({
  onSave,
  onClose,
}: {
  onSave: (data: Omit<FamilyMember, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", relationship: "SPOUSE",
    dateOfBirth: "", biometrics: false, medical: false, passportReady: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add family member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[["First name", "firstName"], ["Last name", "lastName"]].map(([lbl, key]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">{lbl}</label>
              <input
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={String(form[key as keyof typeof form])}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Relationship</label>
          <select
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          >
            {["SPOUSE", "CHILD", "DEPENDENT_PARENT", "SIBLING", "OTHER"].map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Date of birth</label>
          <input
            type="date"
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
        </div>

        <div className="flex gap-6">
          {[
            ["biometrics", "Biometrics required"],
            ["medical", "Medical exam required"],
            ["passportReady", "Passport ready"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form[key as keyof typeof form])}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                className="w-4 h-4 rounded accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">
            {saving ? "Adding…" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`/api/clients/${clientId}`)
      .then((r) => r.json())
      .then((d) => setClient(d.client))
      .catch(() => showToast("Failed to load client.", "err"))
      .finally(() => setLoading(false));
  }, [clientId]);

  const updateField = async (field: string, value: string) => {
    if (!client) return;
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Update failed.", "err");
      throw new Error();
    }
    setClient({ ...client, [field]: value });
    showToast("Saved.", "ok");
  };

  const addFamilyMember = async (data: Omit<FamilyMember, "id">) => {
    const res = await fetch(`/api/clients/${clientId}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { showToast("Failed to add member.", "err"); return; }
    const { member } = await res.json();
    setClient((prev) => prev ? { ...prev, familyMembers: [...prev.familyMembers, member] } : prev);
    setShowAddFamily(false);
    showToast("Family member added.", "ok");
  };

  const removeFamilyMember = async (memberId: string) => {
    const res = await fetch(`/api/clients/${clientId}/family/${memberId}`, { method: "DELETE" });
    if (!res.ok) { showToast("Failed to remove member.", "err"); return; }
    setClient((prev) =>
      prev ? { ...prev, familyMembers: prev.familyMembers.filter((m) => m.id !== memberId) } : prev
    );
    showToast("Member removed.", "ok");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  );
  if (!client) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Client not found.</div>
  );

  // Billing computed values
  const trustBalance = client.trustTransactions.reduce((sum, t) => {
    return ["DEPOSIT", "TRANSFER_FROM_OPERATING"].includes(t.type)
      ? sum + t.amount : sum - t.amount;
  }, 0);
  const totalBilled = client.invoices.reduce((s, i) => s + i.amountDue, 0);
  const totalPaid = client.invoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstandingAR = totalBilled - totalPaid;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {showAddFamily && (
        <AddFamilyModal onSave={addFamilyMember} onClose={() => setShowAddFamily(false)} />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Back + header */}
        <div>
          <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft size={15} /> All clients
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                {client.firstName[0]}{client.lastName[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {client.firstName} {client.lastName}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-xs text-slate-400">{client.clientRef}</span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    client.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                    client.status === "CLOSED" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {client.status}
                  </span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Mode {client.engagementMode}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total billed", value: fmt(totalBilled), color: "text-slate-900", icon: <FileText size={16} className="text-slate-500" /> },
            { label: "Total collected", value: fmt(totalPaid), color: "text-emerald-700", icon: <Check size={16} className="text-emerald-500" /> },
            { label: "Outstanding A/R", value: fmt(outstandingAR), color: outstandingAR > 0 ? "text-amber-700" : "text-slate-400", icon: <AlertCircle size={16} className="text-amber-500" /> },
            { label: "Trust balance", value: fmt(trustBalance), color: "text-blue-700", icon: <CreditCard size={16} className="text-blue-500" /> },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-4 py-4">
              <div className="flex items-center gap-2 mb-1">
                {k.icon}
                <span className="text-xs text-slate-500">{k.label}</span>
              </div>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Contact & profile ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Mail size={14} /> Contact & profile
              </h2>

              <EditableField label="First name" value={client.firstName} onSave={(v) => updateField("firstName", v)} />
              <EditableField label="Last name" value={client.lastName} onSave={(v) => updateField("lastName", v)} />
              <EditableField label="Email" value={client.email} type="email" onSave={(v) => updateField("email", v)} />
              <EditableField label="Phone" value={client.phone} type="tel" onSave={(v) => updateField("phone", v)} />
              <EditableField
                label="Status"
                value={client.status}
                onSave={(v) => updateField("status", v)}
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                  { value: "CLOSED", label: "Closed" },
                ]}
              />
              <EditableField
                label="Engagement mode"
                value={client.engagementMode}
                onSave={(v) => updateField("engagementMode", v)}
                options={[
                  { value: "A", label: "Mode A" },
                  { value: "B", label: "Mode B" },
                  { value: "C", label: "Mode C" },
                ]}
              />
              <EditableField label="Assigned RCIC" value={client.rcicName} onSave={(v) => updateField("rcicName", v)} />
            </div>

            {/* Cases */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText size={14} /> Cases
              </h2>
              {client.cases.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No cases yet.</p>
              ) : (
                <div className="space-y-2">
                  {client.cases.map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.caseRef}</p>
                        <p className="text-xs text-slate-400">{c.stage.replace(/_/g, " ")}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Family + Billing ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Family panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users size={14} /> Family members
                  <span className="text-xs text-slate-400 font-normal">({client.familyMembers.length})</span>
                </h2>
                <button
                  onClick={() => setShowAddFamily(true)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Add member
                </button>
              </div>

              {client.familyMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No family members recorded.</p>
                  <button onClick={() => setShowAddFamily(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                    Add the first one
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {client.familyMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {m.firstName[0]}{m.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-slate-400">{m.relationship.replace(/_/g, " ")} · DOB {m.dateOfBirth || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          {m.biometrics && <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">BIO</span>}
                          {m.medical && <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">MED</span>}
                          {m.passportReady && <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">PP✓</span>}
                        </div>
                        <button
                          onClick={() => removeFamilyMember(m.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <DollarSign size={14} /> Invoices & billing
                </h2>
                <Link
                  href={`/cases/${client.cases[0]?.id}/invoices`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Manage invoices →
                </Link>
              </div>

              {client.invoices.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">No invoices yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Ref", "Milestone", "Amount", "Paid", "Status"].map((h) => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {client.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2 font-mono text-xs text-slate-500">{inv.invoiceRef}</td>
                        <td className="py-2 text-slate-700">{inv.milestoneLabel ?? "Custom"}</td>
                        <td className="py-2 text-slate-900 font-medium">{fmt(inv.amountDue)}</td>
                        <td className="py-2 text-emerald-700">{fmt(inv.amountPaid)}</td>
                        <td className="py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            inv.status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                            inv.status === "PARTIAL" ? "bg-amber-100 text-amber-800" :
                            inv.status === "ISSUED" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Trust ledger */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CreditCard size={14} /> Trust ledger
                  <span className={`ml-2 text-sm font-bold ${trustBalance > 0 ? "text-blue-700" : "text-slate-400"}`}>
                    {fmt(trustBalance)} held
                  </span>
                </h2>
              </div>

              {client.trustTransactions.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">No trust transactions.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {client.trustTransactions.map((t) => {
                    const isCredit = ["DEPOSIT", "TRANSFER_FROM_OPERATING"].includes(t.type);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-slate-700">{t.type.replace(/_/g, " ")}</p>
                          <p className="text-xs text-slate-400">{t.memo}</p>
                        </div>
                        <span className={`text-sm font-semibold ${isCredit ? "text-emerald-700" : "text-red-600"}`}>
                          {isCredit ? "+" : "−"}{fmt(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
