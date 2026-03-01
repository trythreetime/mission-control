"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob, OverviewStat } from "@/lib/dashboard";

export type OverviewApiData = {
  overviewStats: OverviewStat[];
  jobs: DashboardJob[];
};

type Props = {
  initialData: OverviewApiData;
};

export function OverviewLive({ initialData }: Props) {
  const [data, setData] = useState<OverviewApiData>(initialData);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const pull = async () => {
      try {
        const response = await fetch("/api/overview", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ApiResponse<OverviewApiData>;
        if (!payload.ok) {
          throw new Error(payload.error.message || "API error");
        }

        if (!stopped) {
          setData(payload.data);
          setLastSyncAt(new Date());
          setPollError(null);
        }
      } catch (error) {
        if (!stopped) {
          setPollError(error instanceof Error ? error.message : "Polling failed");
        }
      }
    };

    const id = setInterval(pull, 8_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  const statusText = useMemo(() => {
    if (pollError) return `Live sync paused: ${pollError}`;
    if (!lastSyncAt) return "Live polling every 8s";
    return `Live updated at ${lastSyncAt.toLocaleTimeString()}`;
  }, [lastSyncAt, pollError]);

  return (
    <div className="space-y-6">
      <p className={`text-xs ${pollError ? "text-amber-300" : "text-slate-400"}`}>{statusText}</p>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.overviewStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-cyan-300">{stat.trend}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-base font-medium">Recent Jobs</h2>
        <div className="space-y-2 text-sm">
          {data.jobs.length === 0 ? <p className="text-slate-400">No jobs found.</p> : null}
          {data.jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2">
              <span>
                {job.id} · {job.name}
              </span>
              <span className="text-slate-300">{job.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
