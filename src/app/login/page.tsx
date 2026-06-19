"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mfaCode: mfaCode || undefined }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.mfaRequired) {
      setMfaStep(true);
      return;
    }
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(data.error ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-xl px-5 py-3">
            <Image src="/nbv-logo.png" alt="Next Bridge Ventures" width={259} height={49} priority />
          </div>
          <div className="text-sm text-slate-400 mt-3">Immigration CRM — staff sign-in</div>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl p-8 shadow-xl">
          <label className="label">Login ID (email)</label>
          <input
            className="input mb-4"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@nextbridgeventures.ca"
            required
            autoFocus
          />
          <label className="label">Password</label>
          <input
            className="input mb-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mfaStep && (
            <>
              <label className="label mt-2">Two-factor code (authenticator app)</label>
              <input
                className="input mb-2 tracking-[0.5em] text-center font-bold"
                inputMode="numeric"
                maxLength={6}
                placeholder="······"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </>
          )}
          {error && <div className="text-red-600 text-sm font-semibold mb-2">{error}</div>}
          <button className="btn w-full py-3 mt-3" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-[11px] text-slate-400 text-center mt-4">
            Sessions expire after 8h · 5 failed attempts locks the account · all sign-ins audit-logged
          </div>
        </form>
      </div>
    </div>
  );
}
