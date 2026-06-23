"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = { relationship: "SPOUSE", firstName: "", lastName: "", dateOfBirth: "", citizenship: "", passportNumber: "", passportExpiry: "", occupationOrGrade: "" };

export default function AddFamilyMember({ clientId }: { clientId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [accompanying, setAccompanying] = useState(true);
  const [priorRefusals, setPriorRefusals] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"none" | "verified" | "unverified">("none");
  const [passportImageKey, setPassportImageKey] = useState("");
  const [passportImageMime, setPassportImageMime] = useState("");

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  function resetAll() {
    setF(EMPTY);
    setPassportImageKey("");
    setPassportImageMime("");
    setScanStatus("none");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function scanPassport() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setError(""); setScanning(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/clients/${clientId}/family/scan-passport`, { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    setScanning(false);
    if (!res.ok) { setError(d.error ?? "Could not read passport"); return; }
    setPassportImageKey(d.storageKey);
    setPassportImageMime(d.mimeType);
    setScanStatus(d.valid ? "verified" : "unverified");
    if (d.fields) {
      setF((prev) => ({
        ...prev,
        firstName: d.fields.firstName || prev.firstName,
        lastName: d.fields.lastName || prev.lastName,
        dateOfBirth: d.fields.dateOfBirth || prev.dateOfBirth,
        citizenship: d.fields.nationality || prev.citizenship,
        passportNumber: d.fields.passportNumber || prev.passportNumber,
        passportExpiry: d.fields.passportExpiry || prev.passportExpiry,
      }));
    }
  }

  async function submit() {
    setError(""); setWarnings([]); setBusy(true);
    const res = await fetch(`/api/clients/${clientId}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        accompanying,
        priorRefusals,
        passportExpiry: f.passportExpiry || undefined,
        citizenship: f.citizenship || undefined,
        passportNumber: f.passportNumber || undefined,
        occupationOrGrade: f.occupationOrGrade || undefined,
        passportImageKey: passportImageKey || undefined,
        passportImageMime: passportImageMime || undefined,
        passportVerified: scanStatus === "verified",
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      if (d.warnings?.length) setWarnings(d.warnings);
      resetAll();
      router.refresh();
      if (!d.warnings?.length) setOpen(false);
    } else setError(d.error ?? "Failed");
  }

  if (!open)
    return (
      <div>
        <button className="btn-ghost text-xs" onClick={() => setOpen(true)}>+ Add family member</button>
        {warnings.map((w, i) => <div key={i} className="text-amber-600 text-xs font-semibold mt-1">⚠ {w}</div>)}
      </div>
    );

  const needsScan = accompanying && !passportImageKey;

  return (
    <div className="border border-slate-200 rounded-lg p-3 mt-2 text-xs bg-slate-50">
      <div className="flex items-center gap-2 mb-2">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="text-[11px]" />
        <button className="btn-ghost text-xs" disabled={scanning} onClick={scanPassport}>
          {scanning ? "Reading passport…" : "Scan passport"}
        </button>
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
          <label className="flex items-center gap-1"><input type="checkbox" checked={accompanying} onChange={(e) => setAccompanying(e.target.checked)} /> Accompanying</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={priorRefusals} onChange={(e) => setPriorRefusals(e.target.checked)} /> Prior refusals</label>
        </div>
      </div>
      {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
      {warnings.map((w, i) => <div key={i} className="text-amber-600 font-semibold mt-1">⚠ {w}</div>)}
      <div className="flex gap-2 mt-2 items-center">
        <button className="btn text-xs" disabled={busy || needsScan} onClick={submit}>Add member</button>
        <button className="btn-ghost text-xs" onClick={() => { setOpen(false); resetAll(); }}>Done</button>
        {needsScan && <span className="text-amber-600 text-[11px]">Scan a passport for accompanying members before adding.</span>}
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        Auto: dependent-eligibility (&lt;22), biometrics requirement (14–79), medical flag, LICO recalculation.
      </div>
    </div>
  );
}
