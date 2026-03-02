import type { UserRole } from "@prisma/client";

import { LogoutButton } from "@/components/logout-button";

type Props = {
  userEmail: string;
  role: UserRole;
};

export function Topbar({ userEmail, role }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black/20 px-6 backdrop-blur-xl">
      <h1 className="text-base font-semibold tracking-wide text-white">Mission Control</h1>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
          Healthy
        </span>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">
          {role}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{userEmail}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
