"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function AppSidebar({ user }: { user: { name: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="lg:hidden flex items-center justify-between bg-navy text-white px-4 py-2.5 sticky top-0 z-30">
        <div className="bg-white rounded-lg px-2.5 py-1.5 inline-block">
          <Image src="/nbv-logo.png" alt="Next Bridge Ventures" width={120} height={23} priority />
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="p-2 -mr-2 text-2xl leading-none"
        >
          {open ? "✕" : "☰"}
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`bg-navy text-slate-300 flex flex-col shrink-0 w-64 fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:w-56 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-5 border-b border-white/10">
          <div className="bg-white rounded-lg px-3 py-2 inline-block">
            <Image src="/nbv-logo.png" alt="Next Bridge Ventures" width={150} height={28} priority />
          </div>
          <div className="text-[10px] text-slate-400 tracking-wide mt-1.5">C11 IMMIGRATION CRM</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-[13px] hover:bg-white/10 hover:text-white ${
                pathname?.startsWith(n.href) ? "bg-white/10 text-white" : ""
              }`}
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
    </>
  );
}
