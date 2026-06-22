"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IncorporationData, buildIncorporationPackage } from "@/lib/incorporationTypes";

const STEPS = ["Company Name", "Registered Office", "Directors", "Share Structure", "Incorporator", "Review & Submit"];

export default function IncorporationForm({
  caseId,
  fileNumber,
  initial,
}: {
  caseId: string;
  fileNumber: string;
  initial: IncorporationData;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [d, setD] = useState<IncorporationData>(initial);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  const set = <K extends keyof IncorporationData>(k: K) => (e: any) =>
    setD((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const setDirector = (i: number, k: string, v: string) =>
    setD((p) => ({ ...p, directors: p.directors.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) }));
  const addDirector = () =>
    setD((p) => ({ ...p, directors: [...p.directors, { first: "", last: "", addr: "", resident: "yes", role: "Director" }] }));
  const removeDirector = (i: number) => setD((p) => ({ ...p, directors: p.directors.filter((_, idx) => idx !== i) }));

  const setShare = (i: number, k: string, v: string) =>
    setD((p) => ({ ...p, shares: p.shares.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) }));
  const addShare = () =>
    setD((p) => ({ ...p, shares: [...p.shares, { name: "", qty: "Unlimited", par: "No par value", rights: "Voting and participating", custom: "" }] }));
  const removeShare = (i: number) => setD((p) => ({ ...p, shares: p.shares.filter((_, idx) => idx !== i) }));

  async function save() {
    setSaving(true); setSaveMsg(""); setSaveError("");
    const res = await fetch(`/api/cases/${caseId}/incorporation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const r = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) { setSaveMsg("Saved."); router.refresh(); } else setSaveError(r.error ?? "Save failed");
  }

  function downloadPackage() {
    const pkg = buildIncorporationPackage(d, fileNumber);
    const corpName = d.nameType === "numbered" ? "Numbered_Company" : `${d.corpName}_${d.legalEnding}`.replace(/\s+/g, "_");
    const blob = new Blob([pkg], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Alberta_Incorporation_${corpName.replace(/[^a-zA-Z0-9_]/g, "")}_${fileNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitToAgent() {
    if (!agentEmail) return;
    setSubmitting(true); setSubmitMsg(""); setSubmitError("");
    await save();
    const res = await fetch(`/api/cases/${caseId}/incorporation/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentEmail }),
    });
    const r = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok) { setSubmitMsg(`✅ Package sent to ${agentEmail}.`); router.refresh(); } else setSubmitError(r.error ?? "Submission failed");
  }

  const corpNamePreview = d.nameType === "numbered" ? "Numbered Company (auto-assigned)" : `${d.corpName} ${d.legalEnding}`.trim();
  const regAddr = [d.regStreet, d.regSuite, d.regCity, "Alberta", d.regPostal].filter(Boolean).join(", ");

  return (
    <div>
      {/* Step nav */}
      <div className="flex gap-1 overflow-x-auto mb-4 border-b border-slate-200">
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <button
              key={label}
              onClick={() => setStep(n)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px ${
                n === step ? "border-teal text-teal" : n < step ? "border-transparent text-teal/70" : "border-transparent text-slate-400"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${n === step ? "bg-teal text-white" : n < step ? "bg-teal-light text-teal" : "bg-slate-100 text-slate-400"}`}>
                {n}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-teal-light border border-teal/20 rounded-lg p-3 text-[13px] text-navy">
            ℹ️ Alberta requires a <b>NUANS name search report</b> (≤90 days old) unless you choose a numbered company.
            Run via a registry agent or <a className="text-teal underline" href="https://www.nuans.com" target="_blank" rel="noreferrer">nuans.com</a> — cost ~$30 NUANS + $275 filing.
          </div>
          <div>
            <label className="label">Name Type *</label>
            <select className="input" value={d.nameType} onChange={set("nameType")}>
              <option value="">— Select —</option>
              <option value="named">Named Company (e.g. ACME Corp Ltd.)</option>
              <option value="numbered">Numbered Company (auto-assigned)</option>
            </select>
          </div>
          {d.nameType === "named" && (
            <>
              <div>
                <label className="label">Proposed Corporate Name * <span className="text-slate-400 font-normal">— must end in Ltd., Inc., Corp., etc.</span></label>
                <input className="input" placeholder="e.g. Siddiqui Ventures Ltd." value={d.corpName} onChange={set("corpName")} />
              </div>
              <div>
                <label className="label">NUANS Report Number * <span className="text-slate-400 font-normal">from nuans.com or registry agent</span></label>
                <input className="input" placeholder="e.g. 012345678" value={d.nuansNumber} onChange={set("nuansNumber")} />
              </div>
              <div>
                <label className="label">NUANS Report Date *</label>
                <input className="input" type="date" value={d.nuansDate} onChange={set("nuansDate")} />
              </div>
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <label className="label text-amber-700">Alternate Names <span className="text-amber-600 font-normal">(optional — if NUANS finds the first name unavailable, list backups in order of preference)</span></label>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-2">
                  <input className="input" placeholder="Alternate name 1 (optional)" value={d.altName1} onChange={set("altName1")} />
                  <input className="input" placeholder="Alternate name 2 (optional)" value={d.altName2} onChange={set("altName2")} />
                  <input className="input" placeholder="Alternate name 3 (optional)" value={d.altName3} onChange={set("altName3")} />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label">Legal Ending *</label>
            <select className="input" value={d.legalEnding} onChange={set("legalEnding")}>
              <option value="">— Select —</option>
              <option value="Ltd.">Ltd.</option>
              <option value="Limited">Limited</option>
              <option value="Inc.">Inc.</option>
              <option value="Incorporated">Incorporated</option>
              <option value="Corp.">Corp.</option>
              <option value="Corporation">Corporation</option>
            </select>
          </div>
          <div>
            <label className="label">Business Activity / Nature of Business *</label>
            <textarea className="input" rows={3} placeholder="e.g. Consulting services, real estate investment, software development..." value={d.bizActivity} onChange={set("bizActivity")} />
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-teal-light border border-teal/20 rounded-lg p-3 text-[13px] text-navy">
            ℹ️ The registered office <b>must be a physical Alberta address</b> (no PO Box) — where legal documents are served.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Street Address *</label>
              <input className="input" placeholder="e.g. 123 Main Street NW" value={d.regStreet} onChange={set("regStreet")} />
            </div>
            <div>
              <label className="label">Suite / Unit</label>
              <input className="input" placeholder="e.g. Suite 200" value={d.regSuite} onChange={set("regSuite")} />
            </div>
            <div>
              <label className="label">City *</label>
              <input className="input" placeholder="e.g. Calgary" value={d.regCity} onChange={set("regCity")} />
            </div>
            <div>
              <label className="label">Province</label>
              <input className="input opacity-60" value="Alberta" readOnly />
            </div>
            <div>
              <label className="label">Postal Code *</label>
              <input className="input" placeholder="e.g. T2P 1J9" maxLength={7} value={d.regPostal} onChange={set("regPostal")} />
            </div>
          </div>
          <hr className="border-slate-200" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.sameAddress} onChange={set("sameAddress")} /> Records address same as registered office
          </label>
          {!d.sameAddress && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Records Street Address</label>
                <input className="input" placeholder="e.g. 456 Business Ave" value={d.recStreet} onChange={set("recStreet")} />
              </div>
              <div>
                <label className="label">Records City</label>
                <input className="input" placeholder="e.g. Edmonton" value={d.recCity} onChange={set("recCity")} />
              </div>
              <div>
                <label className="label">Records Postal Code</label>
                <input className="input" placeholder="e.g. T5K 2M5" value={d.recPostal} onChange={set("recPostal")} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-teal-light border border-teal/20 rounded-lg p-3 text-[13px] text-navy">
            ℹ️ Alberta requires <b>at least 1 director</b> (18+). At least <b>25% must be Canadian residents</b> (or 1, if fewer than 4 directors).
          </div>
          {d.directors.map((dir, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative">
              <div className="text-xs font-bold text-teal uppercase tracking-wide mb-3">Director {i + 1}</div>
              {d.directors.length > 1 && (
                <button className="absolute top-3 right-3 text-xs text-red-500 hover:underline" onClick={() => removeDirector(i)}>Remove</button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name *</label>
                  <input className="input" value={dir.first} onChange={(e) => setDirector(i, "first", e.target.value)} />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input className="input" value={dir.last} onChange={(e) => setDirector(i, "last", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Residential Address *</label>
                  <input className="input" placeholder="Full address including city and postal code" value={dir.addr} onChange={(e) => setDirector(i, "addr", e.target.value)} />
                </div>
                <div>
                  <label className="label">Canadian Resident? *</label>
                  <select className="input" value={dir.resident} onChange={(e) => setDirector(i, "resident", e.target.value)}>
                    <option value="yes">Yes — Canadian Resident</option>
                    <option value="no">No — Non-Resident</option>
                  </select>
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={dir.role} onChange={(e) => setDirector(i, "role", e.target.value)}>
                    <option>Director</option>
                    <option>Director & President</option>
                    <option>Director & Secretary</option>
                    <option>Director, President & Secretary</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button className="btn-ghost text-xs" onClick={addDirector}>＋ Add Director</button>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-teal-light border border-teal/20 rounded-lg p-3 text-[13px] text-navy">
            ℹ️ Most small businesses use unlimited common shares with no par value. Customize if needed (voting vs non-voting, preferred for family trusts, etc.).
          </div>
          {d.shares.map((s, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative">
              <div className="text-xs font-bold text-teal uppercase tracking-wide mb-3">Share Class {i + 1}</div>
              {d.shares.length > 1 && (
                <button className="absolute top-3 right-3 text-xs text-red-500 hover:underline" onClick={() => removeShare(i)}>Remove</button>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Class Name *</label>
                  <input className="input" placeholder="e.g. Class A Common" value={s.name} onChange={(e) => setShare(i, "name", e.target.value)} />
                </div>
                <div>
                  <label className="label">Authorized Quantity *</label>
                  <input className="input" placeholder="e.g. Unlimited or 1,000,000" value={s.qty} onChange={(e) => setShare(i, "qty", e.target.value)} />
                </div>
                <div>
                  <label className="label">Par Value</label>
                  <input className="input" placeholder="e.g. No par value" value={s.par} onChange={(e) => setShare(i, "par", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Rights & Restrictions</label>
                  <select className="input" value={s.rights} onChange={(e) => setShare(i, "rights", e.target.value)}>
                    <option>Voting and participating</option>
                    <option>Non-voting and participating</option>
                    <option>Voting and non-participating</option>
                    <option>Preferred — fixed dividend</option>
                    <option>Custom (specify below)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Custom Rights <span className="text-slate-400 font-normal">if custom</span></label>
                  <input className="input" placeholder="Describe rights..." value={s.custom} onChange={(e) => setShare(i, "custom", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn-ghost text-xs" onClick={addShare}>＋ Add Share Class</button>
          <hr className="border-slate-200" />
          <div>
            <label className="label">Share Transfer Restrictions <span className="text-slate-400 font-normal">leave blank for none</span></label>
            <textarea className="input" rows={2} placeholder="e.g. No shares shall be transferred without prior approval of the directors by resolution." value={d.shareRestrictions} onChange={set("shareRestrictions")} />
          </div>
          <div>
            <label className="label">Business Restrictions <span className="text-slate-400 font-normal">leave blank for none (recommended)</span></label>
            <textarea className="input" rows={2} placeholder="e.g. The business of the corporation is restricted to real estate activities." value={d.bizRestrictions} onChange={set("bizRestrictions")} />
          </div>
          <div>
            <label className="label">Other Provisions <span className="text-slate-400 font-normal">leave blank for none</span></label>
            <textarea className="input" rows={2} placeholder="e.g. Special provisions for weighted voting..." value={d.otherProvisions} onChange={set("otherProvisions")} />
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-teal-light border border-teal/20 rounded-lg p-3 text-[13px] text-navy">
            ℹ️ The <b>incorporator</b> signs the Articles. Typically the filer, a lawyer, or a director — doesn't need to be a director or shareholder.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input" value={d.incFirstName} onChange={set("incFirstName")} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" value={d.incLastName} onChange={set("incLastName")} />
            </div>
            <div className="col-span-2">
              <label className="label">Address *</label>
              <input className="input" placeholder="e.g. 123 Main St NW, Calgary, AB T2P 1J9" value={d.incAddress} onChange={set("incAddress")} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="e.g. 403-555-1234" value={d.incPhone} onChange={set("incPhone")} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={d.incEmail} onChange={set("incEmail")} />
            </div>
            <div className="col-span-2">
              <label className="label">Signature Date *</label>
              <input className="input" type="date" value={d.signDate} onChange={set("signDate")} />
            </div>
          </div>
          <hr className="border-slate-200" />
          <div>
            <label className="label">Fiscal Year End <span className="text-slate-400 font-normal">most choose Dec 31</span></label>
            <select className="input" value={d.fiscalYearEnd} onChange={set("fiscalYearEnd")}>
              <option value="December 31">December 31</option>
              <option value="March 31">March 31</option>
              <option value="June 30">June 30</option>
              <option value="September 30">September 30</option>
            </select>
          </div>
        </div>
      )}

      {/* STEP 6 */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ReviewItem label="Corporation Name" value={corpNamePreview} full />
            <ReviewItem label="Business Activity" value={d.bizActivity} full />
            <ReviewItem label="Registered Office" value={regAddr} full />
            <ReviewItem label={`Directors (${d.directors.filter((x) => x.first).length})`} value={d.directors.filter((x) => x.first).map((x) => `${x.first} ${x.last} — ${x.role}`).join(", ") || "—"} />
            <ReviewItem label={`Share Classes (${d.shares.filter((x) => x.name).length})`} value={d.shares.filter((x) => x.name).map((x) => `${x.name}: ${x.qty}`).join(", ") || "—"} />
            <ReviewItem label="Incorporator" value={`${d.incFirstName} ${d.incLastName}`.trim() || "—"} />
            <ReviewItem label="Estimated Cost" value={`$275 filing fee${d.nameType === "named" ? " + ~$30 NUANS" : ""}`} />
          </div>

          <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center gap-3">
            <button className="btn-ghost text-sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "💾 Save Draft"}</button>
            <button className="btn-ghost text-sm" onClick={downloadPackage}>⬇ Download Package</button>
            {saveMsg && <span className="text-emerald-600 text-xs font-semibold">{saveMsg}</span>}
            {saveError && <span className="text-red-600 text-xs font-semibold">{saveError}</span>}
          </div>

          <div className="border border-teal/30 bg-teal-light rounded-lg p-4">
            <div className="text-sm font-bold text-navy mb-1">🚀 Submit to Registry Agent</div>
            <p className="text-xs text-slate-600 mb-3">
              Alberta's corporate registry has no public submission API — incorporations are filed online through an authorized{" "}
              <a className="text-teal underline" href="https://www.alberta.ca/find-a-registry-agent" target="_blank" rel="noreferrer">Registry Agent</a>.
              Enter the agent's email below to send them this filled package (they'll file it on CORES and bill the $275 fee).
            </p>
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1 min-w-[220px]" type="email" placeholder="registry-agent@example.com" value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} />
              <button className="btn text-sm" onClick={submitToAgent} disabled={submitting || !agentEmail}>{submitting ? "Sending…" : "Send to Registry Agent"}</button>
            </div>
            {submitMsg && <div className="text-emerald-700 text-xs font-semibold mt-2">{submitMsg}</div>}
            {submitError && <div className="text-red-600 text-xs font-semibold mt-2">{submitError}</div>}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200">
        {step > 1 && <button className="btn-ghost text-sm" onClick={() => setStep(step - 1)}>← Back</button>}
        {step < 6 && <button className="btn text-sm" onClick={() => setStep(step + 1)}>Next Step →</button>}
        <span className="text-xs text-slate-400 ml-auto">Step {step} of 6</span>
      </div>
    </div>
  );
}

function ReviewItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-3 ${full ? "col-span-2" : ""}`}>
      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-navy font-medium">{value || "—"}</div>
    </div>
  );
}
