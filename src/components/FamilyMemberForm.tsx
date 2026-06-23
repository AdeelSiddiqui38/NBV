"use client";

import { useRef, useState } from "react";

export type FamilyMemberValues = {
  relationship: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  citizenship: string;
  passportNumber: string;
  passportExpiry: string;
  occupationOrGrade: string;
  accompanying: boolean;
  priorRefusals: boolean;
  passportImageKey: string;
  passportImageMime: string;
  passportVerified: boolean;
};

const EMPTY: FamilyMemberValues = {
  relationship: "SPOUSE", firstName: "", lastName: "", dateOfBirth: "", citizenship: "",
  passportNumber: "", passportExpiry: "", occupationOrGrade: "", accompanying: true, priorRefusals: false,
  passportImageKey: "", passportImageMime: "", passportVerified: false,
};

const SCAN_TIMEOUT_MS = 30_000; // client-side backstop, slightly above the server's own 25s timeout

export default function FamilyMemberForm({
  clientId, memberId, initial, onSaved, onCancel,
}: {
  clientId: string;
  memberId?: string; // present => edit (PATCH); absent => create (POST)
  initial?: Partial<FamilyMemberValues>;
  onSaved: (warnings: string[]) => void;
  onCancel: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<FamilyMemberValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"none" | "verified" | "unverified">(
    f.passportImageKey ? (f.passportVerified ? "verified" : "unverified") : "none"
  );

  const set = (k: keyof FamilyMemberValues) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function scanPassport() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setError(""); setScanning(true);
    const form = new FormData();
    form.append("file", file);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/clients/${clientId}/family/scan-passport`, { method: "POST", body: form, signal: controller.signal });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Could not read passport"); return; }
      setF((prev) => ({
        ...prev,
        passportImageKey: d.storageKey,
        passportImageMime: d.mimeType,
        firstName: d.fields?.firstName || prev.firstName,
        lastName: d.fields?.lastName || prev.lastName,
        dateOfBirth: d.fields?.dateOfBirth || prev.dateOfBirth,
        citizenship: d.fields?.nationality || prev.citizenship,
        passportNumber: d.fields?.passportNumber || prev.passportNumber,
        passportExpiry: d.fields?.passportExpiry || prev.passportExpiry,
      }));
      setScanStatus(d.valid ? "verified" : "unverified");
      if (d.warnings?.length) setWarnings(d.warnings);
    } catch (err: any) {
      setError(
        err?.name === "AbortError"
          ? "Passport scan timed out — try a clearer or smaller photo, or enter details manually below."
          : "Could not reach the server to scan the passport. Check your connection and try again, or enter details manually."
      );
    } finally {
      clearTimeout(timer);
      setScanning(false);
    }
  }

  async function submit() {
    setError(""); setWarnings([]); setBusy(true);
    const url = memberId ? `/api/clients/${clientId}/family/${memberId}` : `/api/clients/${clientId}/family`;
    const res = await fetch(url, {
      method: memberId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        passportExpiry: f.passportExpiry || undefined,
        citizenship: f.citizenship || undefined,
        passportNumber: f.passportNumber || undefined,
        occupationOrGrade: f.occupationOrGrade || undefined,
        passportImageKey: f.passportImageKey || undefined,
        passportImageMime: f.passportImageMime || undefined,
        passportVerified: scanStatus === "verified",
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) onSaved(d.warnings ?? []);
    else setError(d.error ?? "Failed");
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 mt-2 text-xs bg-slate-50">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="text-[11px]" />
        <button className="btn-ghost text-xs" disabled={scanning} onClick={scanPassport}>
          {scanning ? "Reading passport…" : f.passportImageKey ? "Re-scan passport" : "Scan passport"}
        </button>
        {f.passportImageKey && <span className="text-slate-400">A passport scan is attached.</span>}
      </div>
      {scanStatus === "verified" && (
        <div className="text-green-700 font-semibold mb-2">✓ Read from passport — verify the fields below before saving.</div>
      )}
      {scanStatus === "unverified" && (
        <div className="text-amber-600 font-semibold mb-2">⚠ Could not fully read the MRZ — check fields carefully against the attached scan.</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <select className="input" value={f.relationship} onChange={set("relationship")}>
          <option value="SPOUSE">Spouse</option>
          <option value="COMMON_LAW">Common-law partner</option>
          <option value="CHILD">Child</option>
          <option value="PARENT">Parent (non-acc.)</option>
          <option value="OTHER">Other</option>
        </select>
        <input className="input" placeholder="First name *" value={f.firstName} onChange={set("firstName")} />
        <input className="input" placeholder="Last name *" value={f.lastName} onChange={set("lastName")} />
        <input className="input" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
        <input className="input" placeholder="Citizenship" value={f.citizenship} onChange={set("citizenship")} />
        <input className="input" placeholder="Passport number" value={f.passportNumber} onChange={set("passportNumber")} />
        <input className="input" type="date" placeholder="Passport expiry" value={f.passportExpiry} onChange={set("passportExpiry")} />
        <input className="input" placeholder="Occupation / school grade" value={f.occupationOrGrade} onChange={set("occupationOrGrade")} />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.accompanying} onChange={(e) => setF({ ...f, accompanying: e.target.checked })} /> Accompanying</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.priorRefusals} onChange={(e) => setF({ ...f, priorRefusals: e.target.checked })} /> Prior refusals</label>
        </div>
      </div>
      {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
      {warnings.map((w, i) => <div key={i} className="text-amber-600 font-semibold mt-1">⚠ {w}</div>)}
      <div className="flex gap-2 mt-2 items-center">
        <button className="btn text-xs" disabled={busy} onClick={submit}>{busy ? "Saving…" : memberId ? "Save changes" : "Add member"}</button>
        <button className="btn-ghost text-xs" onClick={onCancel}>Cancel</button>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        Auto: dependent-eligibility (&lt;22), biometrics requirement (14–79), medical flag, LICO recalculation. A passport scan isn't required to save — attach one whenever it's available.
      </div>
    </div>
  );
}
