import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await db.activityLog.findMany({ orderBy: { at: "desc" }, take: 100 });

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-2">Audit Log & Compliance</h1>
      <div className="text-[13px] text-slate-500 mb-5">
        Append-only activity log — every entity, every user, every action. The CICC "who did what, when" backbone.
      </div>
      <div className="card">
        <table className="w-full">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="text-xs whitespace-nowrap">{new Date(l.at).toLocaleString("en-CA")}</td>
                <td className="text-xs font-semibold">{l.actorName}</td>
                <td><span className="pill pill-gray">{l.action}</span></td>
                <td className="text-xs">{l.entityType}</td>
                <td className="text-xs text-slate-500">{l.detail}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="text-slate-400">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
