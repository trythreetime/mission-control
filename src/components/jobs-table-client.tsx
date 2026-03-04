"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { DashboardJob } from "@/lib/services/types";

type Props = {
  jobs: DashboardJob[];
};

export function JobsTableClient({ jobs }: Props) {
  const [query, setQuery] = useState("");

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return jobs;
    }

    return jobs.filter((job) => {
      const searchableFields = [
        job.id,
        job.name,
        job.status,
        (job as DashboardJob & { title?: string }).title,
      ];

      return searchableFields.some((field) => field?.toLowerCase().includes(normalizedQuery));
    });
  }, [jobs, query]);

  const emptyMessage =
    query.trim().length > 0
      ? `No jobs match "${query.trim()}". Try a different search.`
      : "No jobs found.";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <h2 className="mb-4 text-lg font-semibold text-white">Jobs Queue</h2>
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search jobs..."
        aria-label="Search jobs"
        className="mb-4 border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-400 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20"
      />
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
          {filteredJobs.length === 0 ? (
            <tr className="border-t border-white/10">
              <td colSpan={5} className="py-4 text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {filteredJobs.map((job) => (
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
