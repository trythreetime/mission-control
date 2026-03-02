"use client";

import { useState } from "react";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardAlert } from "@/lib/services/types";

type Props = {
  initialAlerts: DashboardAlert[];
  canAcknowledge: boolean;
};

type AckResponse = {
  id: string;
  status: "acknowledged";
};

export function AlertsListClient({ initialAlerts, canAcknowledge }: Props) {
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

      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: payload.data.status } : a)));
      setHint(`Alert ${id} acknowledged`);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Acknowledge failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <h2 className="mb-4 text-lg font-semibold text-white">Alerts Center</h2>
      {hint ? <p className="mb-3 text-xs text-cyan-200">{hint}</p> : null}
      <div className="space-y-2 text-sm">
        {alerts.length === 0 ? <p className="text-slate-400">No alerts found.</p> : null}
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-100">
                  {alert.id} · {alert.title}
                </p>
                <p className="mt-1 text-slate-300">
                  Severity: {alert.severity} · Status: {alert.status} · Target: {alert.target}
                </p>
              </div>

              {canAcknowledge && alert.status === "open" ? (
                <button
                  type="button"
                  onClick={() => onAck(alert.id)}
                  disabled={busyId === alert.id}
                  className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-60"
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
