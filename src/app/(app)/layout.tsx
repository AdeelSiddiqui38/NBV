import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const NAV = [
  { href: "/dashboard", label: "📊 Dashboard" },
  { href: "/leads", label: "🧲 Leads & Quotes" },
  { href: "/clients", label: "👤 Clients & Family" },
  { href: "/cases", label: "🗂 C11 Cases" },
  { href: "/billing", label: "💵 Billing & Trust" },
  { href: "/expenses", label: "🧾 NBV Expenses" },
  { href: "/reports", label: "📑 Reports & Compliance" },
  { href: "/users", label: "👥 Users & Access" },
  { href: "/audit", label: "🛡 Audit Log" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-navy text-slate-300 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="text-white font-extrabold">⛰ NEXT BRIDGE</div>
          <div className="text-[10px] text-slate-400 tracking-wide">VENTURES — C11 CRM</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block px-3 py-2 rounded-lg text-[13px] hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-xs">
          <div className="text-white font-bold">{user.name}</div>
          <div className="text-slate-400">{user.role}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
