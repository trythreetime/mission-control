"use client";

import type { UserRole } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ApiResponse } from "@/lib/api-response";
import { UserRoleEditor } from "@/components/user-role-editor";

type UserStatusFilter = "active" | "disabled";

type UsersApiData = {
  users: Array<{
    userId: string;
    email: string;
    role: UserRole;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    query: string;
    role: UserRole | null;
    status: UserStatusFilter | null;
  };
};

type UsersQueryState = {
  query: string;
  role: UserRole | null;
  status: UserStatusFilter | null;
  page: number;
  pageSize: number;
};

type FilterFormState = {
  query: string;
  role: string;
  status: string;
  pageSize: string;
};

const USER_ROLES: UserRole[] = ["viewer", "operator", "admin"];
const STATUS_OPTIONS: UserStatusFilter[] = ["active", "disabled"];
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

function parseRole(value: string | null): UserRole | null {
  if (!value) {
    return null;
  }

  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

function parseStatus(value: string | null): UserStatusFilter | null {
  if (!value) {
    return null;
  }

  return STATUS_OPTIONS.includes(value as UserStatusFilter) ? (value as UserStatusFilter) : null;
}

function parseUsersQuery(searchParams: URLSearchParams): UsersQueryState {
  return {
    query: searchParams.get("query")?.trim() ?? "",
    role: parseRole(searchParams.get("role")),
    status: parseStatus(searchParams.get("status")),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

function toQueryString(params: UsersQueryState): string {
  const query = new URLSearchParams();

  if (params.query) {
    query.set("query", params.query);
  }

  if (params.role) {
    query.set("role", params.role);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.page !== DEFAULT_PAGE) {
    query.set("page", String(params.page));
  }

  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    query.set("pageSize", String(params.pageSize));
  }

  return query.toString();
}

function toFormState(params: UsersQueryState): FilterFormState {
  return {
    query: params.query,
    role: params.role ?? "",
    status: params.status ?? "",
    pageSize: String(params.pageSize),
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsersTableClient() {
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const router = useRouter();

  const currentQuery = useMemo(
    () => parseUsersQuery(new URLSearchParams(rawSearchParams.toString())),
    [rawSearchParams],
  );

  const [formState, setFormState] = useState<FilterFormState>(() => toFormState(currentQuery));
  const [data, setData] = useState<UsersApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormState(toFormState(currentQuery));
  }, [currentQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const queryString = toQueryString(currentQuery);

    const loadUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users${queryString.length > 0 ? `?${queryString}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as ApiResponse<UsersApiData>;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
        }

        setData(payload.data);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load users.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => controller.abort();
  }, [currentQuery]);

  const users = data?.users ?? [];
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

  const replaceQuery = (next: UsersQueryState) => {
    const nextQueryString = toQueryString(next);
    router.replace(nextQueryString.length > 0 ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <span className="text-sm text-slate-300">
          Total: {pagination.total}
          {loading ? " · Loading..." : ""}
        </span>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          replaceQuery({
            query: formState.query.trim(),
            role: parseRole(formState.role),
            status: parseStatus(formState.status),
            page: DEFAULT_PAGE,
            pageSize: parsePageSize(formState.pageSize),
          });
        }}
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:col-span-2">
          Search Email
          <input
            type="text"
            name="query"
            value={formState.query}
            onChange={(event) => setFormState((current) => ({ ...current, query: event.target.value }))}
            placeholder="user@example.com"
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Role
          <select
            name="role"
            value={formState.role}
            onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All roles</option>
            <option value="viewer">viewer</option>
            <option value="operator">operator</option>
            <option value="admin">admin</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Status
          <select
            name="status"
            value={formState.status}
            onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="disabled">disabled</option>
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
                query: "",
                role: "",
                status: "",
                pageSize: String(DEFAULT_PAGE_SIZE),
              });
              router.replace(pathname, { scroll: false });
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
              <th className="py-2 text-center">Email</th>
              <th className="text-center">User ID</th>
              <th className="text-center">Role</th>
              <th className="text-center">Status</th>
              <th className="text-center">Last Login</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && data === null ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  Loading users...
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

            {!loading && !error && users.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : null}

            {!error
              ? users.map((user) => (
                  <tr key={user.userId} className="border-t border-white/10 align-top">
                    <td className="py-3 text-center font-medium text-slate-100">{user.email}</td>
                    <td className="text-center font-mono text-xs text-slate-300">{user.userId}</td>
                    <td className="text-center">
                      <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                        {user.role}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                        {user.status}
                      </span>
                    </td>
                    <td className="text-center">{formatDateTime(user.lastLoginAt)}</td>
                    <td className="text-center">
                      <UserRoleEditor
                        userId={user.userId}
                        email={user.email}
                        currentRole={user.role}
                        onUpdated={(nextRole) => {
                          setData((current) => {
                            if (!current) {
                              return current;
                            }

                            return {
                              ...current,
                              users: current.users.map((candidate) =>
                                candidate.userId === user.userId ? { ...candidate, role: nextRole } : candidate,
                              ),
                            };
                          });
                        }}
                      />
                    </td>
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
