import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate, daysUntil } from "@/lib/constants";
import { folderAllowed } from "@/lib/permissions";
import UploadDoc from "@/components/UploadDoc";
import DocActions from "@/components/DocActions";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  REQUESTED: "pill-red",
  RECEIVED: "pill-blue",
  UNDER_REVIEW: "pill-amber",
  APPROVED: "pill-green",
  SUBMITTED: "pill-teal",
  EXPIRED: "pill-gray",
};

export default async function CaseDocuments({ params }: { params: { id: string } }) {
  const user = await getSession();
  const c = await db.case.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      folders: { include: { documents: { orderBy: [{ docType: "asc" }, { version: "desc" }] } }, orderBy: { code: "asc" } },
      documents: { where: { unfiled: true } },
    },
  });
  if (!c) notFound();

  const visibleFolders = c.folders.filter((f) => folderAllowed(user!.role, f.code));
  const allDocs = c.folders.flatMap((f) => f.documents);
  const expiring = allDocs.filter((d) => {
    const days = daysUntil(d.expiryDate);
    return days !== null && days <= 90 && d.status !== "EXPIRED";
  });

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h1 className="text-lg font-bold text-navy">🗄 Repository — {c.fileNumber}</h1>
        <span className="text-sm text-slate-500">{c.client.firstName} {c.client.lastName}</span>
        <Link href={`/cases/${c.id}`} className="text-teal underline text-sm ml-auto">← Back to case</Link>
      </div>
      <div className="text-xs text-slate-500 mb-4">
        {allDocs.length} documents · all SHA-256 hashed & versioned · every download audit-logged ·
        {c.status === "CLOSED" ? " ⛔ CLOSED FILE — read-only" : " naming auto-enforced"}
      </div>

      {c.documents.length > 0 && (
        <div className="card mb-4 border-amber-300 bg-amber-50">
          <h3 className="text-sm font-bold text-amber-800 mb-2">📥 Unfiled queue ({c.documents.length}) — file it or it isn't filed</h3>
          {c.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 py-2 border-b border-amber-200 last:border-0 text-xs flex-wrap">
              <span><b>{d.name}</b> · {d.docType} · {((d.size ?? 0) / 1024).toFixed(0)} KB · sha {d.sha256?.slice(0, 10)}…</span>
              <DocActions
                docId={d.id}
                status={d.status}
                locked={d.locked}
                unfiled={true}
                folders={visibleFolders.map((f) => ({ id: f.id, label: `${f.code} ${f.name}` }))}
              />
            </div>
          ))}
        </div>
      )}

      {expiring.length > 0 && (
        <div className="card mb-4 border-red-200">
          <h3 className="text-sm font-bold text-red-700 mb-2">⏳ Expiring ≤ 90 days</h3>
          {expiring.map((d) => (
            <div key={d.id} className="text-xs py-1">
              <b>{d.name}</b> — expires {fmtDate(d.expiryDate)} ({daysUntil(d.expiryDate)} days)
            </div>
          ))}
        </div>
      )}

      <div className="card mb-4">
        <h3 className="text-sm font-bold text-navy mb-2">⬆ Upload document</h3>
        <UploadDoc
          caseId={c.id}
          folders={visibleFolders.map((f) => ({ id: f.id, label: `${f.code} ${f.name}` }))}
          disabled={c.status === "CLOSED"}
        />
      </div>

      {visibleFolders.map((f) => (
        <div key={f.id} className="card mb-3">
          <h3 className="text-sm font-bold text-navy mb-2">
            {f.code} · {f.name} <span className="text-slate-400 font-normal">({f.documents.length})</span>
            {f.code === "13" && <span className="pill pill-gray ml-2">staff-only · excluded from client exports</span>}
          </h3>
          {f.documents.length === 0 ? (
            <div className="text-xs text-slate-400">Empty.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr><th>Document</th><th>Party</th><th>Status</th><th>Ver</th><th>Expiry</th><th>Integrity</th><th>Actions</th></tr></thead>
              <tbody>
                {f.documents.map((d) => (
                  <tr key={d.id}>
                    <td className="text-xs font-semibold">
                      {d.storageKey ? (
                        <a className="underline text-navy" href={`/api/documents/${d.id}/file`}>{d.name}</a>
                      ) : d.name}
                      {d.locked && <span className="ml-1">🔒</span>}
                    </td>
                    <td className="text-xs">{d.party}</td>
                    <td><span className={`pill ${STATUS_PILL[d.status] ?? "pill-gray"}`}>{d.status.replace(/_/g, " ")}</span></td>
                    <td className="text-xs">v{d.version}</td>
                    <td className="text-xs">{fmtDate(d.expiryDate)}</td>
                    <td className="text-[10px] text-slate-400">{d.sha256 ? `sha ${d.sha256.slice(0, 10)}…` : "—"}</td>
                    <td>
                      <DocActions docId={d.id} status={d.status} locked={d.locked} unfiled={false} folders={[]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
