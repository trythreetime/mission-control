"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { ApiResponse } from "@/lib/api-response";

type UserStatusFilter = "active" | "disabled";
type UserAuditAction = "role_changed" | "status_changed";

type AuditLogItem = {
  id: string;
  targetUserId: string;
  targetEmail: string;
  actorUserId: string;
  actorEmail: string;
  action: UserAuditAction;
  roleBefore: UserRole | null;
  roleAfter: UserRole | null;
  statusBefore: UserStatusFilter | null;
  statusAfter: UserStatusFilter | null;
  createdAt: string;
};

type UserAuditApiData = {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    targetEmail: string;
    actorEmail: string;
    action: UserAuditAction | null;
  };
};

type AuditQueryState = {
  targetEmail: string;
  actorEmail: string;
  action: UserAuditAction | null;
  page: number;
  pageSize: number;
};

type FilterFormState = {
  targetEmail: string;
  actorEmail: string;
  action: string;
  pageSize: string;
};

const ACTION_OPTIONS: UserAuditAction[] = ["role_changed", "status_changed"];
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_PAGE;
  }

  return parsed;
}

function parsePageSize(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return DEFAULT_PAGE_SIZE;
  }

  return parsed;
}

function parseAction(value: string | null): UserAuditAction | null {
  if (!value) {
    return null;
  }

  return ACTION_OPTIONS.includes(value as UserAuditAction) ? (value as UserAuditAction) : null;
}

function parseAuditQuery(searchParams: URLSearchParams): AuditQueryState {
  return {
    targetEmail: searchParams.get("targetEmail")?.trim() ?? "",
    actorEmail: searchParams.get("actorEmail")?.trim() ?? "",
    action: parseAction(searchParams.get("action")),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

function toQueryString(params: AuditQueryState): string {
  const query = new URLSearchParams();

  if (params.targetEmail) {
    query.set("targetEmail", params.targetEmail);
  }

  if (params.actorEmail) {
    query.set("actorEmail", params.actorEmail);
  }

  if (params.action) {
    query.set("action", params.action);
  }

  if (params.page !== DEFAULT_PAGE) {
    query.set("page", String(params.page));
  }

  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    query.set("pageSize", String(params.pageSize));
  }

  return query.toString();
}

function toFormState(params: AuditQueryState): FilterFormState {
  return {
    targetEmail: params.targetEmail,
    actorEmail: params.actorEmail,
    action: params.action ?? "",
    pageSize: String(params.pageSize),
  };
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAction(action: string): string {
  return action.replace("_", " ");
}

function formatBeforeValue(log: AuditLogItem): string {
  if (log.action === "status_changed") {
    return log.statusBefore ?? "-";
  }

  return log.roleBefore ?? "-";
}

function formatAfterValue(log: AuditLogItem): string {
  if (log.action === "status_changed") {
    return log.statusAfter ?? "-";
  }

  return log.roleAfter ?? "-";
}

export function UserAuditTableClient() {
  const [currentQuery, setCurrentQuery] = useState<AuditQueryState>(() => {
    if (typeof window === "undefined") {
      return {
        targetEmail: "",
        actorEmail: "",
        action: null,
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
      };
    }

    return parseAuditQuery(new URLSearchParams(window.location.search));
  });
  const [formState, setFormState] = useState<FilterFormState>(() => toFormState(currentQuery));
  const [data, setData] = useState<UserAuditApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setCurrentQuery(parseAuditQuery(new URLSearchParams(window.location.search)));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setFormState(toFormState(currentQuery));
  }, [currentQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const queryString = toQueryString(currentQuery);

    const loadAuditLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users/audit${queryString.length > 0 ? `?${queryString}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as ApiResponse<UserAuditApiData>;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
        }

        setData(payload.data);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load user audit logs.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadAuditLogs();

    return () => controller.abort();
  }, [currentQuery]);

  const logs = data?.logs ?? [];
  const pagination = data?.pagination ?? {
    page: currentQuery.page,
    pageSize: currentQuery.pageSize,
    total: 0,
    totalPages: 1,
  };

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const rangeStart = pagination.total === 0 ? 0 : (currentPage - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.total, currentPage * pagination.pageSize);

  const replaceQuery = (next: AuditQueryState) => {
    const nextQueryString = toQueryString(next);
    const nextUrl = nextQueryString.length > 0 ? `${window.location.pathname}?${nextQueryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
    setCurrentQuery(next);
  };

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">User Audit Log</h2>
        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
          >
            Back to Users
          </Link>
          <span className="text-sm text-slate-300">
            Total: {pagination.total}
            {loading ? " · Loading..." : ""}
          </span>
        </div>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          replaceQuery({
            targetEmail: formState.targetEmail.trim(),
            actorEmail: formState.actorEmail.trim(),
            action: parseAction(formState.action),
            page: DEFAULT_PAGE,
            pageSize: parsePageSize(formState.pageSize),
          });
        }}
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:col-span-2">
          Target Email
          <input
            type="text"
            name="targetEmail"
            value={formState.targetEmail}
            onChange={(event) => setFormState((current) => ({ ...current, targetEmail: event.target.value }))}
            placeholder="target@example.com"
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:col-span-2">
          Actor Email
          <input
            type="text"
            name="actorEmail"
            value={formState.actorEmail}
            onChange={(event) => setFormState((current) => ({ ...current, actorEmail: event.target.value }))}
            placeholder="actor@example.com"
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Action
          <select
            name="action"
            value={formState.action}
            onChange={(event) => setFormState((current) => ({ ...current, action: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All actions</option>
            <option value="role_changed">role_changed</option>
            <option value="status_changed">status_changed</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Page Size
          <select
            name="pageSize"
            value={formState.pageSize}
            onChange={(event) => setFormState((current) => ({ ...current, pageSize: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-end gap-2 md:col-span-5">
          <button
            type="button"
            onClick={() => {
              setFormState({
                targetEmail: "",
                actorEmail: "",
                action: "",
                pageSize: String(DEFAULT_PAGE_SIZE),
              });
              window.history.replaceState(null, "", window.location.pathname);
              setCurrentQuery({
                targetEmail: "",
                actorEmail: "",
                action: null,
                page: DEFAULT_PAGE,
                pageSize: DEFAULT_PAGE_SIZE,
              });
            }}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
          >
            Reset
          </button>
          <button
            type="submit"
            className="rounded-md border border-cyan-300/30 bg-cyan-400/15 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-400/25"
          >
            Apply
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2 text-center">Time</th>
              <th className="text-center">Action</th>
              <th className="text-center">Target User</th>
              <th className="text-center">Actor User</th>
              <th className="text-center">Before</th>
              <th className="text-center">After</th>
            </tr>
          </thead>
          <tbody>
            {loading && data === null ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  Loading audit logs...
                </td>
              </tr>
            ) : null}

            {!loading && error ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-4 text-center text-rose-300">
                  {error}
                </td>
              </tr>
            ) : null}

            {!loading && !error && logs.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No audit logs found.
                </td>
              </tr>
            ) : null}

            {!error
              ? logs.map((log) => (
                  <tr key={log.id} className="border-t border-white/10 align-middle">
                    <td className="py-3 text-center">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 text-center">
                      <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="font-medium text-slate-100">{log.targetEmail}</div>
                      <div className="font-mono text-xs text-slate-300">{log.targetUserId}</div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="font-medium text-slate-100">{log.actorEmail}</div>
                      <div className="font-mono text-xs text-slate-300">{log.actorUserId}</div>
                    </td>
                    <td className="py-3 text-center">{formatBeforeValue(log)}</td>
                    <td className="py-3 text-center">{formatAfterValue(log)}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
        <p>
          Showing {rangeStart}-{rangeEnd} of {pagination.total}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!hasPrevious) {
                return;
              }

              replaceQuery({ ...currentQuery, page: currentPage - 1 });
            }}
            className={`rounded-md border border-white/15 px-3 py-1.5 ${
              hasPrevious
                ? "bg-white/5 text-slate-200 hover:bg-white/10"
                : "pointer-events-none bg-white/5 text-slate-500 opacity-60"
            }`}
            disabled={!hasPrevious}
          >
            Previous
          </button>

          <span>
            Page {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => {
              if (!hasNext) {
                return;
              }

              replaceQuery({ ...currentQuery, page: currentPage + 1 });
            }}
            className={`rounded-md border border-white/15 px-3 py-1.5 ${
              hasNext
                ? "bg-white/5 text-slate-200 hover:bg-white/10"
                : "pointer-events-none bg-white/5 text-slate-500 opacity-60"
            }`}
            disabled={!hasNext}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
