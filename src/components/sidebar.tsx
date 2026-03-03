"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNavItems = [
  { href: "/", label: "Overview" },
  { href: "/jobs", label: "Jobs" },
  { href: "/nodes", label: "Nodes" },
  { href: "/events", label: "Events" },
  { href: "/alerts", label: "Alerts" },
];

type Props = {
  role: UserRole;
};

export function Sidebar({ role }: Props) {
  const pathname = usePathname();
  const navItems = role === "admin" ? [...baseNavItems, { href: "/users", label: "Users" }] : baseNavItems;

  return (
    <aside className="w-64 border-r border-white/10 bg-black/40 p-5 backdrop-blur-xl">
      <div className="mb-8 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold tracking-wide text-slate-100">
        Mission Control
      </div>
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "border border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
