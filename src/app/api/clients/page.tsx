"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type EngagementMode = "A" | "B" | "C";
type ClientStatus = "ACTIVE" | "INACTIVE" | "CLOSED";

interface Client {
  id: string;
  clientRef: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  engagementMode: EngagementMode;
  status: ClientStatus;
  rcicName: string;
  trustBalance: number;
  outstandingAR: number;
  familySize: number;
  createdAt: string;
  cases: { id: string; caseRef: string; stage: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const modeBadge: Record<EngagementMode, string> = {
  A: "bg-blue-100 text-blue-800",
  B: "bg-purple-100 text-purple-800",
  C: "bg-amber-100 text-amber-800",
};

const statusBadge: Record<ClientStatus, { cls: string; icon: React.ReactNode }> = {
  ACTIVE: {
    cls: "bg-emerald-100 text-emerald-800",
    icon: <CheckCircle2 size={12} />,
  },
  INACTIVE: {
    cls: "bg-slate-100 text-slate-600",
    icon: <Clock size={12} />,
  },
  CLOSED: {
    cls: "bg-red-100 text-red-700",
    icon: <X size={12} />,
  },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  client,
  onConfirm,
  onCancel,
}: {
  client: Client;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Remove client?</h2>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium text-slate-700">
                {client.firstName} {client.lastName}
              </span>{" "}
              ({client.clientRef}) will be permanently deleted along with all
              associated records. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Delete client
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick-edit inline form ───────────────────────────────────────────────────

function QuickEditRow({
  client,
  onSave,
  onCancel,
}: {
  client: Client;
  onSave: (data: Partial<Client>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    status: client.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch {
      setError("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-blue-50 border-t border-b border-blue-200">
      <td colSpan={8} className="px-4 py-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">First name</label>
            <input
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Last name</label>
            <input
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Email</label>
            <input
              type="email"
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Phone</label>
            <input
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="flex gap-2 items-center ml-auto">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Add New Client Slide-in panel ───────────────────────────────────────────

function AddClientPanel({
  onSave,
  onClose,
}: {
  onSave: (data: Omit<Client, "id" | "clientRef" | "createdAt" | "cases" | "trustBalance" | "outstandingAR">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    engagementMode: "A" as EngagementMode,
    status: "ACTIVE" as ClientStatus,
    rcicName: "",
    familySize: 1,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Valid email required";
    if (!form.rcicName.trim()) e.rcicName = "Required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type = "text",
    placeholder = ""
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={String(form[key])}
        onChange={(e) => {
          setForm({ ...form, [key]: type === "number" ? +e.target.value : e.target.value });
          if (errors[key]) setErrors({ ...errors, [key]: "" });
        }}
        className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors[key] ? "border-red-400" : "border-slate-300"
        }`}
      />
      {errors[key] && <span className="text-xs text-red-500">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Add new client</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {field("First name", "firstName", "text", "Jane")}
            {field("Last name", "lastName", "text", "Smith")}
          </div>
          {field("Email", "email", "email", "jane@example.com")}
          {field("Phone", "phone", "tel", "+1 (416) 555-0100")}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Engagement mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["A", "B", "C"] as EngagementMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, engagementMode: m })}
                  className={`py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    form.engagementMode === m
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Mode {m}
                </button>
              ))}
            </div>
          </div>

          {field("Assigned RCIC", "rcicName", "text", "Amrit Gill")}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Family size
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.familySize}
              onChange={(e) => setForm({ ...form, familySize: +e.target.value })}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create client"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<EngagementMode | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<ClientStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<keyof Client>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients ?? []);
    } catch {
      showToast("Could not load clients.", "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleUpdate = async (id: string, data: Partial<Client>) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
    setEditingId(null);
    showToast("Client updated.", "ok");
  };

  const handleDelete = async (client: Client) => {
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Delete failed — client may have active cases.", "err");
    } else {
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      showToast(`${client.firstName} ${client.lastName} removed.`, "ok");
    }
    setDeletingClient(null);
  };

  const handleAdd = async (
    data: Omit<Client, "id" | "clientRef" | "createdAt" | "cases" | "trustBalance" | "outstandingAR">
  ) => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    const { client } = await res.json();
    setClients((prev) => [client, ...prev]);
    setShowAdd(false);
    showToast("Client created.", "ok");
  };

  // ── Filter & sort ─────────────────────────────────────────────────────────

  const filtered = clients
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.clientRef.toLowerCase().includes(q);
      const matchMode = filterMode === "ALL" || c.engagementMode === filterMode;
      const matchStatus = filterStatus === "ALL" || c.status === filterStatus;
      return matchSearch && matchMode && matchStatus;
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (key: keyof Client) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: keyof Client }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
    ) : (
      <span className="opacity-0 group-hover:opacity-40 transition-opacity">
        <ChevronDown size={13} />
      </span>
    );

  // ── KPI strip ─────────────────────────────────────────────────────────────

  const totalAR = clients.reduce((s, c) => s + c.outstandingAR, 0);
  const totalTrust = clients.reduce((s, c) => s + c.trustBalance, 0);
  const activeCount = clients.filter((c) => c.status === "ACTIVE").length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {deletingClient && (
        <DeleteModal
          client={deletingClient}
          onConfirm={() => handleDelete(deletingClient)}
          onCancel={() => setDeletingClient(null)}
        />
      )}
      {showAdd && <AddClientPanel onSave={handleAdd} onClose={() => setShowAdd(false)} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeCount} active · {clients.length} total
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus size={16} />
            Add client
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active clients", value: String(activeCount), icon: <Users size={18} className="text-blue-600" />, bg: "bg-blue-50" },
            { label: "Total A/R", value: fmt(totalAR), icon: <DollarSign size={18} className="text-amber-600" />, bg: "bg-amber-50" },
            { label: "Trust held", value: fmt(totalTrust), icon: <DollarSign size={18} className="text-emerald-600" />, bg: "bg-emerald-50" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                {k.icon}
              </div>
              <div>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-xl font-bold text-slate-900">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & filters */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, email, or ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Mode</span>
            {(["ALL", "A", "B", "C"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterMode === m
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Status</span>
            {(["ALL", "ACTIVE", "INACTIVE", "CLOSED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterStatus === s
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-slate-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              Loading clients…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Users size={36} className="text-slate-300" />
              <p className="text-slate-500 text-sm">No clients found</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-1 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Add first client
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      { label: "Client", key: "lastName" as keyof Client },
                      { label: "Ref", key: "clientRef" as keyof Client },
                      { label: "Mode", key: "engagementMode" as keyof Client },
                      { label: "RCIC", key: "rcicName" as keyof Client },
                      { label: "A/R", key: "outstandingAR" as keyof Client },
                      { label: "Trust", key: "trustBalance" as keyof Client },
                      { label: "Status", key: "status" as keyof Client },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="group px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          <SortIcon col={col.key} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((client) => (
                    <>
                      <tr
                        key={client.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          editingId === client.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {client.firstName[0]}{client.lastName[0]}
                            </div>
                            <div>
                              <Link
                                href={`/clients/${client.id}`}
                                className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                              >
                                {client.firstName} {client.lastName}
                              </Link>
                              <p className="text-xs text-slate-400">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{client.clientRef}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${modeBadge[client.engagementMode]}`}>
                            Mode {client.engagementMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{client.rcicName}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {client.outstandingAR > 0 ? (
                            <span className="text-amber-700">{fmt(client.outstandingAR)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-emerald-700">
                          {fmt(client.trustBalance)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge[client.status].cls}`}>
                            {statusBadge[client.status].icon}
                            {client.status.charAt(0) + client.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() =>
                                setEditingId(editingId === client.id ? null : client.id)
                              }
                              title="Quick edit"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingClient(client)}
                              title="Delete client"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {editingId === client.id && (
                        <QuickEditRow
                          key={`edit-${client.id}`}
                          client={client}
                          onSave={(data) => handleUpdate(client.id, data)}
                          onCancel={() => setEditingId(null)}
                        />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
