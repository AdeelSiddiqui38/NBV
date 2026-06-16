"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteUser() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "CASE_MANAGER", rcicLicenseNo: "" });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Invite user</button>;

  return (
    <div className="card mb-4">
      <h3 className="text-sm font-bold text-navy mb-2">Invite a team member</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <input className="input" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" placeholder="Email (login ID)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="CASE_MANAGER">Case Manager</option>
          <option value="RCIC">RCIC</option>
          <option value="PLAN_WRITER">Plan Writer</option>
          <option value="ACCOUNTANT">Accountant</option>
          <option value="ADMIN">Admin</option>
        </select>
        <input className="input" placeholder="RCIC licence # (if RCIC)" value={f.rcicLicenseNo} onChange={(e) => setF({ ...f, rcicLicenseNo: e.target.value })} />
      </div>
      {error && <div className="text-red-600 text-xs font-semibold mt-2">{error}</div>}
      {msg && <div className="text-emerald-700 text-xs font-semibold mt-2">{msg}</div>}
      <div className="flex gap-2 mt-3">
        <button
          className="btn text-xs"
          disabled={busy}
          onClick={async () => {
            setBusy(true); setError(""); setMsg("");
            const res = await fetch("/api/users/invite", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...f, rcicLicenseNo: f.rcicLicenseNo || undefined }),
            });
            const d = await res.json().catch(() => ({}));
            setBusy(false);
            if (res.ok) { setMsg("✅ Invitation sent (dev: link printed to server console). Valid 7 days."); router.refresh(); }
            else setError(d.error ?? "Failed");
          }}
        >Send invitation</button>
        <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}

export function MfaEnrol({ mfaEnabled, mandatory }: { mfaEnabled: boolean; mandatory: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (mfaEnabled) return <span className="pill pill-green">MFA active on your account ✓</span>;

  if (!setup)
    return (
      <button
        className={`btn text-xs ${mandatory ? "" : "btn-ghost"}`}
        onClick={async () => {
          const res = await fetch("/api/auth/mfa");
          const d = await res.json();
          if (res.ok) setSetup(d);
        }}
      >
        {mandatory ? "⚠ Enrol MFA now (mandatory for your role)" : "Enable MFA (recommended)"}
      </button>
    );

  return (
    <div className="border border-slate-200 rounded-lg p-3 text-xs bg-slate-50 max-w-md">
      <div className="font-bold text-navy mb-1">1 · Add to your authenticator app</div>
      <div className="mb-2">Enter this secret manually (or scan the otpauth URI):</div>
      <div className="font-mono bg-white border border-slate-200 rounded p-2 mb-2 break-all select-all">{setup.secret}</div>
      <div className="text-[10px] text-slate-400 mb-3 break-all">{setup.uri}</div>
      <div className="font-bold text-navy mb-1">2 · Enter the 6-digit code to confirm</div>
      <div className="flex gap-2">
        <input className="input w-28 text-center font-bold tracking-widest" maxLength={6} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        <button
          className="btn text-xs"
          disabled={busy || code.length !== 6}
          onClick={async () => {
            setBusy(true); setError("");
            const res = await fetch("/api/auth/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
            const d = await res.json().catch(() => ({}));
            setBusy(false);
            if (res.ok) { setSetup(null); router.refresh(); }
            else setError(d.error ?? "Failed");
          }}
        >Verify & enable</button>
      </div>
      {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
    </div>
  );
}
