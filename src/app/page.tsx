import { headers } from "next/headers";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob, OverviewStat } from "@/lib/dashboard";

type OverviewApiData = {
  overviewStats: OverviewStat[];
  jobs: DashboardJob[];
};

const overviewFallback: OverviewApiData = {
  overviewStats: [],
  jobs: [],
};

async function getOverviewData(): Promise<OverviewApiData> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    if (!host) {
      return overviewFallback;
    }

    const response = await fetch(`${protocol}://${host}/api/overview`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return overviewFallback;
    }

    const payload = (await response.json()) as ApiResponse<OverviewApiData>;
    return payload.ok ? payload.data : overviewFallback;
  } catch {
    return overviewFallback;
  }
}

export default async function OverviewPage() {
  const { overviewStats, jobs } = await getOverviewData();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
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
          {jobs.length === 0 ? <p className="text-slate-400">No jobs found.</p> : null}
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2">
              <span>{job.id} · {job.name}</span>
              <span className="text-slate-300">{job.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
