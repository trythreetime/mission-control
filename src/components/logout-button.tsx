"use client";

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="rounded border border-white/20 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
    >
      {busy ? "Signing out..." : "Logout"}
    </button>
  );
}
