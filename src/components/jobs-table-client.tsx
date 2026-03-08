"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { JobCreateDialog } from "@/components/job-create-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob } from "@/lib/services/types";

type JobsApiData = {
  jobs: DashboardJob[];
};

const SEARCH_DEBOUNCE_MS = 400;
const JOBS_LIMIT = 100;
const ALL_STATUSES_VALUE = "all";
const JOB_STATUS_OPTIONS = ["queued", "running", "success", "failed", "canceled"] as const;

export function JobsTableClient() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [owner, setOwner] = useState(() => searchParams.get("owner") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? ALL_STATUSES_VALUE);

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedOwner, setDebouncedOwner] = useState(owner);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setDebouncedOwner(owner);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, owner]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.delete("query");
    nextParams.delete("owner");
    nextParams.delete("status");

    const normalizedQuery = debouncedQuery.trim();
    const normalizedOwner = debouncedOwner.trim();

    if (normalizedQuery.length > 0) {
      nextParams.set("query", normalizedQuery);
    }

    if (normalizedOwner.length > 0) {
      nextParams.set("owner", normalizedOwner);
    }

    if (status !== ALL_STATUSES_VALUE) {
      nextParams.set("status", status);
    }

    const current = searchParams.toString();
    const next = nextParams.toString();

    if (current !== next) {
      router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedOwner, debouncedQuery, pathname, router, searchParams, status]);

  useEffect(() => {
    const controller = new AbortController();

    const loadJobs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: String(JOBS_LIMIT) });

        const normalizedQuery = debouncedQuery.trim();
        if (normalizedQuery.length > 0) {
          params.set("query", normalizedQuery);
        }

        const normalizedOwner = debouncedOwner.trim();
        if (normalizedOwner.length > 0) {
          params.set("owner", normalizedOwner);
        }

        if (status !== ALL_STATUSES_VALUE) {
          params.set("status", status);
        }

        const response = await fetch(`/api/jobs?${params.toString()}`, {
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
  }, [debouncedOwner, debouncedQuery, refreshVersion, status]);

  const hasActiveFilters = query.trim().length > 0 || owner.trim().length > 0 || status !== ALL_STATUSES_VALUE;

  const tableMessage =
    loading && !hasLoaded
      ? { tone: "muted", text: "Loading jobs..." }
      : !loading && error
        ? { tone: "error", text: error }
        : !loading && !error && jobs.length === 0
          ? {
              tone: "muted",
              text: hasActiveFilters
                ? "No jobs match the current filters. Try adjusting query, owner, or status."
                : "No jobs found.",
            }
          : null;

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Jobs Queue</h2>
            <p className="mt-1 text-sm text-slate-400">Track queued work and create new jobs from the console.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setIsCreateDialogOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/25"
          >
            新增
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs..."
            aria-label="Search jobs"
            className="border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-400 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20"
          />

          <Input
            type="search"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Filter owner..."
            aria-label="Filter owner"
            className="border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-400 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20"
          />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              className="border-white/15 bg-black/20 text-slate-100 data-[placeholder]:text-slate-400"
              aria-label="Filter status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
              {JOB_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOwner("");
              setStatus(ALL_STATUSES_VALUE);
            }}
            className="rounded-md border border-white/15 bg-black/20 px-3 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        {notice ? <p className="mb-4 text-sm text-cyan-200">{notice}</p> : null}

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
                <td
                  colSpan={5}
                  className={`py-4 ${tableMessage.tone === "error" ? "text-rose-300" : "text-slate-400"}`}
                >
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

      <JobCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={(job) => {
          setIsCreateDialogOpen(false);
          setNotice(`${job.id} 已创建，并已加入任务队列。`);
          setRefreshVersion((current) => current + 1);
        }}
      />
    </>
  );
}
