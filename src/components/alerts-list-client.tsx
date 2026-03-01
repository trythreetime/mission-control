"use client";

import { useState } from "react";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardAlert } from "@/lib/dashboard";

type Props = {
  initialAlerts: DashboardAlert[];
};

type AckResponse = {
  id: string;
  status: "acknowledged";
};

export function AlertsListClient({ initialAlerts }: Props) {
  const [alerts, setAlerts] = useState<DashboardAlert[]>(initialAlerts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const onAck = async (id: string) => {
    setBusyId(id);
    setHint(null);
    try {
      const response = await fetch(`/api/alerts/${encodeURIComponent(id)}/ack`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as ApiResponse<AckResponse>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
      }

      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: payload.data.status } : a)),
      );
      setHint(`Alert ${id} acknowledged`);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Acknowledge failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Alerts Center</h2>
      {hint ? <p className="mb-3 text-xs text-cyan-300">{hint}</p> : null}
      <div className="space-y-2 text-sm">
        {alerts.length === 0 ? <p className="text-slate-400">No alerts found.</p> : null}
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
            <p className="font-medium">
              {alert.id} · {alert.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-300">
              <p>
                Severity: {alert.severity} · Status: {alert.status} · Target: {alert.target}
              </p>
              {alert.status === "open" ? (
                <button
                  type="button"
                  onClick={() => onAck(alert.id)}
                  disabled={busyId === alert.id}
                  className="rounded border border-cyan-400/50 px-2 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-60"
                >
                  {busyId === alert.id ? "Acknowledging..." : "Acknowledge"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
