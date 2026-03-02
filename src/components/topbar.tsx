import type { UserRole } from "@prisma/client";

import { LogoutButton } from "@/components/logout-button";

type Props = {
  userEmail: string;
  role: UserRole;
};

export function Topbar({ userEmail, role }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 px-6">
      <h1 className="text-lg font-semibold text-white">Mission Control Dashboard</h1>
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-emerald-200">System: Healthy</span>
        <span className="rounded-full bg-cyan-400/20 px-2 py-1 text-cyan-100">Role: {role}</span>
        <span>{userEmail}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
