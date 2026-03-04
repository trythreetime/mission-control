"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob } from "@/lib/services/types";

type JobsApiData = {
  jobs: DashboardJob[];
};

const SEARCH_DEBOUNCE_MS = 400;
const JOBS_LIMIT = 100;

export function JobsTableClient() {
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    const loadJobs = async () => {
      setLoading(true);
      setError(null);

      try {
        const search = new URLSearchParams({ limit: String(JOBS_LIMIT) });
        const normalizedQuery = debouncedQuery.trim();
        if (normalizedQuery.length > 0) {
          search.set("query", normalizedQuery);
        }

        const response = await fetch(`/api/jobs?${search.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as ApiResponse<JobsApiData>;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
        }

        setJobs(payload.data.jobs);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load jobs.");
        setJobs([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    };

    void loadJobs();

    return () => controller.abort();
  }, [debouncedQuery]);

  const normalizedQuery = query.trim();
  const tableMessage =
    loading && !hasLoaded
      ? { tone: "muted", text: "Loading jobs..." }
      : !loading && error
        ? { tone: "error", text: error }
        : !loading && !error && jobs.length === 0
          ? {
              tone: "muted",
              text:
                normalizedQuery.length > 0
                  ? `No jobs match "${normalizedQuery}". Try a different search.`
                  : "No jobs found.",
            }
          : null;

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
      {loading && hasLoaded ? (
        <p className="mb-4 text-xs text-slate-400" role="status">
          Searching jobs...
        </p>
      ) : null}
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
          {tableMessage ? (
            <tr className="border-t border-white/10">
              <td colSpan={5} className={`py-4 ${tableMessage.tone === "error" ? "text-rose-300" : "text-slate-400"}`}>
                {tableMessage.text}
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
