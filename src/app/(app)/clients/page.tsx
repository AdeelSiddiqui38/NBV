import Link from "next/link";
import { db } from "@/lib/db";
import { fmtCad } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    include: {
      familyMembers: true,
      cases: true,
      trustTxns: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-5">Clients & Family</h1>
      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th>Client #</th><th>Name</th><th>Country</th><th>Family</th><th>Open Cases</th><th>Engagement</th><th>Trust Balance</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const trust = c.trustTxns.reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0);
              const open = c.cases.filter((k) => k.status === "OPEN");
              const mode = open[0]?.engagementMode;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="font-bold text-navy">{c.clientNumber}</td>
                  <td>
                    <Link className="font-semibold underline" href={`/clients/${c.id}`}>
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td>{c.country}</td>
                  <td>
                    {c.familyMembers.length > 0 ? (
                      <span className="pill pill-teal">👨‍👩‍👧 {1 + c.familyMembers.filter((m) => m.accompanying).length} accompanying</span>
                    ) : (
                      <span className="text-slate-400">solo</span>
                    )}
                  </td>
                  <td>{open.map((k) => (
                    <span key={k.id} className="pill pill-blue mr-1">{k.caseType.replace(/_/g, " ")}</span>
                  ))}</td>
                  <td>
                    {mode === "SOLE_OWNERSHIP" && <span className="pill pill-green">A · Sole</span>}
                    {mode === "PARTNERSHIP_FINANCIAL" && <span className="pill pill-purple">B · Financial</span>}
                    {mode === "PARTNERSHIP_SERVICES" && <span className="pill pill-blue">C · Sweat equity</span>}
                  </td>
                  <td className="font-semibold">{fmtCad(trust)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
