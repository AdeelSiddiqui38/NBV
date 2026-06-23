"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FamilyMemberForm from "./FamilyMemberForm";

export default function AddFamilyMember({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (!open)
    return (
      <div>
        <button className="btn-ghost text-xs" onClick={() => { setOpen(true); setWarnings([]); }}>+ Add family member</button>
        {warnings.map((w, i) => <div key={i} className="text-amber-600 text-xs font-semibold mt-1">⚠ {w}</div>)}
      </div>
    );

  return (
    <FamilyMemberForm
      clientId={clientId}
      onCancel={() => setOpen(false)}
      onSaved={(w) => {
        router.refresh();
        setWarnings(w);
        if (!w.length) setOpen(false);
      }}
    />
  );
}
