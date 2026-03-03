import type { ProfileStatus, UserRole } from "@prisma/client";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserRoleEditor } from "@/components/user-role-editor";
import type { ApiResponse } from "@/lib/api-response";
import { hasRoleAtLeast } from "@/lib/auth/roles";
import { requireAppSession } from "@/lib/auth/session";

type UsersApiData = {
  users: Array<{
    userId: string;
    email: string;
    role: UserRole;
    status: ProfileStatus;
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
    status: ProfileStatus | null;
  };
};

type SearchParamsInput = {
  query?: string | string[];
  role?: string | string[];
  status?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

type UsersQueryParams = {
  query?: string;
  role?: string;
  status?: string;
  page?: string;
  pageSize?: string;
};

const USER_ROLES: UserRole[] = ["viewer", "operator", "admin"];
const PROFILE_STATUSES: ProfileStatus[] = ["active", "inactive"];

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeSearchParams(input: SearchParamsInput): UsersQueryParams {
  return {
    query: firstValue(input.query),
    role: firstValue(input.role),
    status: firstValue(input.status),
    page: firstValue(input.page),
    pageSize: firstValue(input.pageSize),
  };
}

function parseUserRole(value: string | undefined): UserRole | null {
  if (!value) {
    return null;
  }

  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

function parseProfileStatus(value: string | undefined): ProfileStatus | null {
  if (!value) {
    return null;
  }

  return PROFILE_STATUSES.includes(value as ProfileStatus) ? (value as ProfileStatus) : null;
}

function buildFallback(params: UsersQueryParams): UsersApiData {
  return {
    users: [],
    pagination: {
      page: Number(params.page ?? "1") || 1,
      pageSize: Number(params.pageSize ?? "20") || 20,
      total: 0,
      totalPages: 1,
    },
    filters: {
      query: params.query ?? "",
      role: parseUserRole(params.role),
      status: parseProfileStatus(params.status),
    },
  };
}

function toQueryString(params: UsersQueryParams): string {
  const query = new URLSearchParams();

  if (params.query && params.query.trim().length > 0) {
    query.set("query", params.query.trim());
  }

  if (params.role && params.role.trim().length > 0) {
    query.set("role", params.role);
  }

  if (params.status && params.status.trim().length > 0) {
    query.set("status", params.status);
  }

  if (params.page && params.page.trim().length > 0) {
    query.set("page", params.page);
  }

  if (params.pageSize && params.pageSize.trim().length > 0) {
    query.set("pageSize", params.pageSize);
  }

  return query.toString();
}

async function getUsersData(params: UsersQueryParams): Promise<UsersApiData> {
  const fallback = buildFallback(params);

  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const cookieHeader = requestHeaders.get("cookie");

    if (!host) {
      return fallback;
    }

    const queryString = toQueryString(params);
    const response = await fetch(
      `${protocol}://${host}/api/users${queryString.length > 0 ? `?${queryString}` : ""}`,
      {
        cache: "no-store",
        ...(cookieHeader ? { headers: { cookie: cookieHeader } } : {}),
      },
    );

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as ApiResponse<UsersApiData>;
    return payload.ok ? payload.data : fallback;
  } catch {
    return fallback;
  }
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

function createPageHref(page: number, current: UsersApiData): string {
  const query = new URLSearchParams();

  if (current.filters.query) {
    query.set("query", current.filters.query);
  }

  if (current.filters.role) {
    query.set("role", current.filters.role);
  }

  if (current.filters.status) {
    query.set("status", current.filters.status);
  }

  query.set("page", String(page));
  query.set("pageSize", String(current.pagination.pageSize));

  return `/users?${query.toString()}`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const session = await requireAppSession();
  if (!hasRoleAtLeast(session.role, "admin")) {
    redirect("/");
  }

  const resolvedSearchParams = normalizeSearchParams(await searchParams);
  const data = await getUsersData(resolvedSearchParams);

  const currentPage = data.pagination.page;
  const totalPages = data.pagination.totalPages;
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const rangeStart = data.pagination.total === 0 ? 0 : (currentPage - 1) * data.pagination.pageSize + 1;
  const rangeEnd = Math.min(data.pagination.total, currentPage * data.pagination.pageSize);

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <span className="text-sm text-slate-300">Total: {data.pagination.total}</span>
      </div>

      <form method="GET" className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:col-span-2">
          Search Email
          <input
            type="text"
            name="query"
            defaultValue={data.filters.query}
            placeholder="user@example.com"
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Role
          <select
            name="role"
            defaultValue={data.filters.role ?? ""}
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
            defaultValue={data.filters.status ?? ""}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Page Size
          <select
            name="pageSize"
            defaultValue={String(data.pagination.pageSize)}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <input type="hidden" name="page" value="1" />

        <div className="flex items-center justify-end gap-2 md:col-span-5">
          <Link
            href="/users"
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
          >
            Reset
          </Link>
          <button
            type="submit"
            className="rounded-md border border-cyan-300/30 bg-cyan-400/15 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-400/25"
          >
            Apply
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2">Email</th>
              <th>User ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.users.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-4 text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : null}

            {data.users.map((user) => (
              <tr key={user.userId} className="border-t border-white/10 align-top">
                <td className="py-3 font-medium text-slate-100">{user.email}</td>
                <td className="font-mono text-xs text-slate-300">{user.userId}</td>
                <td>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                    {user.status}
                  </span>
                </td>
                <td>{formatDateTime(user.lastLoginAt)}</td>
                <td>
                  <UserRoleEditor userId={user.userId} email={user.email} currentRole={user.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
        <p>
          Showing {rangeStart}-{rangeEnd} of {data.pagination.total}
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={hasPrevious ? createPageHref(currentPage - 1, data) : createPageHref(currentPage, data)}
            className={`rounded-md border border-white/15 px-3 py-1.5 ${
              hasPrevious
                ? "bg-white/5 text-slate-200 hover:bg-white/10"
                : "pointer-events-none bg-white/5 text-slate-500 opacity-60"
            }`}
          >
            Previous
          </Link>

          <span>
            Page {currentPage} / {totalPages}
          </span>

          <Link
            href={hasNext ? createPageHref(currentPage + 1, data) : createPageHref(currentPage, data)}
            className={`rounded-md border border-white/15 px-3 py-1.5 ${
              hasNext
                ? "bg-white/5 text-slate-200 hover:bg-white/10"
                : "pointer-events-none bg-white/5 text-slate-500 opacity-60"
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </section>
  );
}
