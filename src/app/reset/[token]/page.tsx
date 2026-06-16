"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    const res = await fetch("/api/auth/reset-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(d.error ?? "Failed");
  }

  if (done)
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="font-bold text-navy mb-2">✅ Password changed — all other sessions signed out.</div>
          <button className="btn" onClick={() => router.push("/login")}>Sign in</button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <form onSubmit={submit} className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="font-bold text-navy text-lg mb-4">Choose a new password</div>
        <input className="input mb-3" type="password" placeholder="Min 12 chars, mixed case + digit" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="text-red-600 text-sm font-semibold mb-2">{error}</div>}
        <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : "Set password"}</button>
      </form>
    </div>
  );
}
