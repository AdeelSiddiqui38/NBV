import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate } from "@/lib/constants";
import { InviteUser, MfaEnrol } from "@/components/UserAdmin";

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
        5 failed attempts → 15-minute lockout. All sign-ins audit-logged. {me?.role !== "ADMIN" && "(Admin role required to manage users.)"}
      </div>

      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-2">🔐 Your MFA</h3>
        <MfaEnrol mfaEnabled={!!meRow?.mfaEnabled} mandatory={["ADMIN", "RCIC"].includes(me!.role)} />
      </div>

      {me!.role === "ADMIN" && <div className="mb-4"><InviteUser /></div>}

      <div className="card mb-5">
        <h3 className="text-sm font-bold text-navy mb-3">Team accounts</h3>
        <table className="w-full">
          <thead><tr><th>User</th><th>Login ID</th><th>Role</th><th>MFA</th><th>Last login</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-bold">{u.name}{u.rcicLicenseNo && <div className="text-[10px] text-slate-400 font-normal">RCIC {u.rcicLicenseNo}</div>}</td>
                <td className="text-xs">{u.email}</td>
                <td>
                  <span className={`pill ${u.role === "ADMIN" ? "pill-red" : u.role === "RCIC" ? "pill-amber" : u.role === "PLAN_WRITER" ? "pill-purple" : u.role === "ACCOUNTANT" ? "pill-teal" : "pill-blue"}`}>
                    {u.role.replace(/_/g, " ")}
                  </span>
                </td>
                <td>{u.mfaEnabled ? <span className="pill pill-green">✓</span> : <span className="text-slate-400 text-xs">—</span>}</td>
                <td className="text-xs">{fmtDate(u.lastLoginAt)}</td>
                <td>
                  <span className={`pill ${u.status === "ACTIVE" ? "pill-green" : u.status === "INVITED" ? "pill-amber" : "pill-gray"}`}>{u.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-3">Recent login events</h3>
        <table className="w-full">
          <thead><tr><th>When</th><th>Email</th><th>Result</th><th>IP</th></tr></thead>
          <tbody>
            {recentLogins.map((e) => (
              <tr key={e.id}>
                <td className="text-xs">{new Date(e.at).toLocaleString("en-CA")}</td>
                <td className="text-xs">{e.email}</td>
                <td>{e.success ? <span className="pill pill-green">success</span> : <span className="pill pill-red">failed</span>}</td>
                <td className="text-xs">{e.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
