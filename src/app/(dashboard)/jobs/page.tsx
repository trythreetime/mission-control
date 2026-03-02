import { headers } from "next/headers";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob } from "@/lib/services/types";

type JobsApiData = {
  jobs: DashboardJob[];
};

const jobsFallback: JobsApiData = {
  jobs: [],
};

async function getJobsData(): Promise<JobsApiData> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const cookieHeader = requestHeaders.get("cookie");

    if (!host) {
      return jobsFallback;
    }

    const response = await fetch(`${protocol}://${host}/api/jobs?limit=100`, {
      cache: "no-store",
      ...(cookieHeader ? { headers: { cookie: cookieHeader } } : {}),
    });

    if (!response.ok) {
      return jobsFallback;
    }

    const payload = (await response.json()) as ApiResponse<JobsApiData>;
    return payload.ok ? payload.data : jobsFallback;
  } catch {
    return jobsFallback;
  }
}

export default async function JobsPage() {
  const { jobs } = await getJobsData();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <h2 className="mb-4 text-lg font-semibold text-white">Jobs Queue</h2>
      <table className="w-full text-left text-sm text-slate-200">
        <thead className="text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="py-2">ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Owner</th>
            <th>ETA</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr className="border-t border-white/10">
              <td colSpan={5} className="py-4 text-slate-400">
                No jobs found.
              </td>
            </tr>
          ) : null}
          {jobs.map((job) => (
            <tr key={job.id} className="border-t border-white/10">
              <td className="py-3 font-medium text-slate-100">{job.id}</td>
              <td>{job.name}</td>
              <td>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                  {job.status}
                </span>
              </td>
              <td>{job.owner}</td>
              <td>{job.eta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
