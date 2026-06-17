import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate } from "@/lib/constants";
import { InviteUser, MfaEnrol, UserActions } from "@/components/UserAdmin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getSession();
  const meRow = await db.user.findUnique({ where: { id: me!.id } });
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  const recentLogins = await db.loginEvent.findMany({ orderBy: { at: "desc" }, take: 12 });

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-2">Users & Access</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-800 mb-5">
        One login per person — no shared accounts. Passwords argon2/bcrypt-hashed (invisible to everyone incl. Admin).
        5 failed attempts → 15-minute lockout. All sign-ins audit-logged.
      </div>
      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-2">🔐 Your MFA</h3>
        <MfaEnrol mfaEnabled={!!meRow?.mfaEnabled} mandatory={["ADMIN","RCIC"].includes(me!.role)} />
      </div>
      {me!.role === "ADMIN" && <div className="mb-4"><InviteUser /></div>}
      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-3">Team accounts</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b text-xs">
              <th className="pb-2 pr-3">User</th>
              <th className="pb-2 pr-3">Login ID</th>
              <th className="pb-2 pr-3">Role</th>
              <th className="pb-2 pr-3">MFA</th>
              <th className="pb-2 pr-3">Last login</th>
              <th className="pb-2 pr-3">Status</th>
              {me!.role === "ADMIN" && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2 pr-3 font-bold">{u.name}
                  {u.rcicLicenseNo && <div className="text-[10px] text-slate-400 font-normal">RCIC {u.rcicLicenseNo}</div>}
                </td>
                <td className="py-2 pr-3 text-xs">{u.email}</td>
                <td className="py-2 pr-3">
                  <span className={`pill ${u.role==="ADMIN"?"pill-red":u.role==="RCIC"?"pill-amber":u.role==="PLAN_WRITER"?"pill-purple":u.role==="ACCOUNTANT"?"pill-teal":"pill-blue"}`}>
                    {u.role.replace(/_/g," ")}
                  </span>
                </td>
                <td className="py-2 pr-3">{u.mfaEnabled?<span className="pill pill-green">✓</span>:<span className="text-slate-400 text-xs">—</span>}</td>
                <td className="py-2 pr-3 text-xs">{fmtDate(u.lastLoginAt)}</td>
                <td className="py-2 pr-3">
                  <span className={`pill ${u.status==="ACTIVE"?"pill-green":u.status==="INVITED"?"pill-amber":"pill-gray"}`}>{u.status}</span>
                </td>
                {me!.role === "ADMIN" && (
                  <td className="py-2"><UserActions user={u} myId={me!.id} /></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-3">Recent login events</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b text-xs">
              <th className="pb-2 pr-3">When</th><th className="pb-2 pr-3">Email</th><th className="pb-2 pr-3">Result</th><th className="pb-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {recentLogins.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="py-1.5 pr-3 text-xs">{new Date(e.at).toLocaleString("en-CA")}</td>
                <td className="py-1.5 pr-3 text-xs">{e.email}</td>
                <td className="py-1.5 pr-3">{e.success?<span className="pill pill-green">success</span>:<span className="pill pill-red">failed</span>}</td>
                <td className="py-1.5 text-xs">{e.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
