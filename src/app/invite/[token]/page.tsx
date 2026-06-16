"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AcceptInvite() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    const res = await fetch("/api/users/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setDone(d.mfaMandatory);
    else setError(d.error ?? "Failed");
  }

  if (done !== null)
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-2xl mb-2">✅</div>
          <div className="font-bold text-navy mb-2">Account activated</div>
          {done && <div className="text-sm text-amber-700 mb-3">Your role requires MFA — you'll be prompted to enrol an authenticator app after first sign-in (Users &amp; Access page).</div>}
          <button className="btn" onClick={() => router.push("/login")}>Sign in</button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <form onSubmit={submit} className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="font-bold text-navy text-lg mb-1">Set your password</div>
        <div className="text-xs text-slate-500 mb-4">Min 12 characters, with upper/lowercase and a digit. Never share it — staff can't see your password, not even Admin.</div>
        <label className="label">New password</label>
        <input className="input mb-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label className="label">Confirm</label>
        <input className="input mb-3" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {error && <div className="text-red-600 text-sm font-semibold mb-2">{error}</div>}
        <button className="btn w-full" disabled={busy}>{busy ? "Activating…" : "Activate account"}</button>
      </form>
    </div>
  );
}
