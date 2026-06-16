"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const DOC_TYPES = [
  "PASSPORT", "PHOTO", "BIRTH_CERT", "MARRIAGE_CERT", "POLICE_CERT", "MEDICAL",
  "RETAINER", "ICA", "IMM5476", "CONSENT", "COI_DISCLOSURE", "ILA_CONFIRMATION",
  "CV", "PRIOR_BUSINESS_PROOF", "NET_WORTH",
  "BUSINESS_PLAN", "MARKET_RESEARCH", "FINANCIAL_PROJECTIONS",
  "NUANS", "ARTICLES", "CERTIFICATE_INC", "BYLAWS", "SHARE_REGISTER", "MINUTE_BOOK", "BN_CONFIRMATION",
  "BANK_CONFIRMATION", "BANK_STATEMENT", "WIRE_RECEIPT", "SOURCE_OF_FUNDS", "PERSONAL_FUNDS",
  "LEASE", "SUPPLIER_LOI", "CONTRACT", "INSURANCE",
  "OFFER_SUMMARY", "COMPLIANCE_FEE", "A_NUMBER_PROOF",
  "IRCC_FORM", "FEE_RECEIPT", "SUBMISSION_LETTER",
  "AOR", "BIOMETRICS_LETTER", "ADR_LETTER", "DECISION_LETTER", "PERMIT",
  "PAYROLL", "T4", "FINANCIAL_STATEMENT",
  "INVOICE", "RECEIPT", "MEMO", "OTHER",
];

export default function UploadDoc({
  caseId, folders, disabled,
}: { caseId: string; folders: { id: string; label: string }[]; disabled?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState("");
  const [docType, setDocType] = useState("OTHER");
  const [party, setParty] = useState("CLIENT");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Choose a file first."); return; }
    setError(""); setMsg(""); setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    if (folderId) fd.append("folderId", folderId);
    fd.append("docType", docType);
    fd.append("party", party);
    if (expiry) fd.append("expiryDate", expiry);

    const res = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMsg(`✅ Stored as ${d.name} (v${d.version}) · sha256 ${d.sha256.slice(0, 12)}…${d.unfiled ? " → UNFILED queue (assign a folder)" : ""}`);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } else setError(d.error ?? "Upload failed");
  }

  return (
    <div className="text-xs">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
        <input ref={fileRef} type="file" className="input col-span-2 lg:col-span-1" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.eml" />
        <select className="input" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
          <option value="">→ Unfiled queue</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input" value={party} onChange={(e) => setParty(e.target.value)}>
          <option value="CLIENT">Client</option>
          <option value="SPOUSE">Spouse</option>
          <option value="CHILD">Child</option>
          <option value="CORP">Corporation</option>
          <option value="NBV">NBV</option>
        </select>
        <input className="input" type="date" title="Expiry date (if any)" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      </div>
      {error && <div className="text-red-600 font-semibold mb-1">{error}</div>}
      {msg && <div className="text-emerald-700 font-semibold mb-1">{msg}</div>}
      <button className="btn text-xs" onClick={upload} disabled={busy || disabled}>
        {busy ? "Uploading…" : "Upload (hashed + versioned)"}
      </button>
      <span className="text-[10px] text-slate-400 ml-3">
        pdf/jpg/png/docx/xlsx/eml · 50 MB max · name auto-generated · re-upload of same type = new version
      </span>
    </div>
  );
}
