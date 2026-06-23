"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/constants";
import AddFamilyMember from "./AddFamilyMember";
import FamilyMemberForm from "./FamilyMemberForm";

type MemberRow = {
  id: string;
  relationship: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  citizenship: string | null;
  passportExpiry: string | null;
  passportImageKey: string | null;
  passportVerified: boolean;
  occupationOrGrade: string | null;
  accompanying: boolean;
  priorRefusals: boolean;
  biometricsStatus: string | null;
  medicalStatus: string | null;
  docsPct: number;
};

export default function FamilyPanel({
  clientId, principal, familyMembers,
}: {
  clientId: string;
  principal: { firstName: string; lastName: string; dateOfBirth: string | null; passportExpiry: string | null };
  familyMembers: MemberRow[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="card mb-5">
      <h3 className="text-sm font-bold text-navy mb-3">👨‍👩‍👧 Family Panel</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b">
              <th className="pb-2 pr-3 text-left">Member</th><th className="pb-2 pr-3 text-left">Relationship</th>
              <th className="pb-2 pr-3 text-left">DOB</th><th className="pb-2 pr-3 text-left">Passport expiry</th>
              <th className="pb-2 pr-3 text-left">Passport</th>
              <th className="pb-2 pr-3 text-left">Biometrics</th><th className="pb-2 pr-3 text-left">Medical</th>
              <th className="pb-2 pr-3 text-left">Docs</th><th className="pb-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-3 font-bold">{principal.firstName} {principal.lastName}</td>
              <td className="py-2 pr-3"><span className="pill pill-blue">Principal</span></td>
              <td className="py-2 pr-3">{fmtDate(principal.dateOfBirth)}</td>
              <td className="py-2 pr-3">{fmtDate(principal.passportExpiry)}</td>
              <td className="py-2 pr-3">—</td>
              <td className="py-2 pr-3">—</td><td className="py-2 pr-3">—</td><td className="py-2 pr-3">—</td>
              <td className="py-2">—</td>
            </tr>
            {familyMembers.map((m) => (
              <Member
                key={m.id}
                clientId={clientId}
                m={m}
                editing={editingId === m.id}
                onToggle={() => setEditingId(editingId === m.id ? null : m.id)}
                onSaved={() => { router.refresh(); setEditingId(null); }}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><AddFamilyMember clientId={clientId} /></div>
    </div>
  );
}

function Member({
  clientId, m, editing, onToggle, onSaved,
}: { clientId: string; m: MemberRow; editing: boolean; onToggle: () => void; onSaved: () => void }) {
  return (
    <>
      <tr className="border-b last:border-0">
        <td className="py-2 pr-3 font-semibold">{m.firstName} {m.lastName}</td>
        <td className="py-2 pr-3">
          {m.relationship}
          {!m.accompanying && <span className="pill pill-gray ml-1">not accompanying</span>}
        </td>
        <td className="py-2 pr-3">{fmtDate(m.dateOfBirth)}</td>
        <td className="py-2 pr-3">{fmtDate(m.passportExpiry)}</td>
        <td className="py-2 pr-3">
          {m.passportImageKey ? (
            <a
              href={`/api/clients/${clientId}/family/${m.id}/passport-file`}
              target="_blank"
              rel="noreferrer"
              className={`pill ${m.passportVerified ? "pill-green" : "pill-gray"}`}
            >
              {m.passportVerified ? "✓ Verified" : "Manual review"}
            </a>
          ) : "—"}
        </td>
        <td className="py-2 pr-3">{m.biometricsStatus ?? "—"}</td>
        <td className="py-2 pr-3">{m.medicalStatus ?? "—"}</td>
        <td className="py-2 pr-3">{m.docsPct}%</td>
        <td className="py-2"><button className="btn-ghost text-xs" onClick={onToggle}>{editing ? "Close" : "Edit"}</button></td>
      </tr>
      {editing && (
        <tr className="border-b">
          <td colSpan={9} className="py-2">
            <FamilyMemberForm
              clientId={clientId}
              memberId={m.id}
              initial={{
                relationship: m.relationship,
                firstName: m.firstName,
                lastName: m.lastName,
                dateOfBirth: m.dateOfBirth.slice(0, 10),
                citizenship: m.citizenship ?? "",
                passportExpiry: m.passportExpiry ? m.passportExpiry.slice(0, 10) : "",
                occupationOrGrade: m.occupationOrGrade ?? "",
                accompanying: m.accompanying,
                priorRefusals: m.priorRefusals,
                passportImageKey: m.passportImageKey ?? "",
                passportVerified: m.passportVerified,
              }}
              onCancel={onToggle}
              onSaved={onSaved}
            />
          </td>
        </tr>
      )}
    </>
  );
}
