"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { UserRoleEditor } from "@/components/user-role-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ApiResponse } from "@/lib/api-response";
import { cn } from "@/lib/utils";

type UserStatusFilter = "active" | "disabled";

type UsersApiData = {
  users: Array<{
    userId: string;
    email: string;
    role: UserRole;
    status: UserStatusFilter;
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

type Props = {
  currentUserId: string;
};

type UpdateStatusApiData = {
  user: {
    userId: string;
    status: UserStatusFilter;
  };
};

const USER_ROLES: UserRole[] = ["viewer", "operator", "admin"];
const STATUS_OPTIONS: UserStatusFilter[] = ["active", "disabled"];
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const ALL_FILTERS_VALUE = "__all";

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

export function UsersTableClient({ currentUserId }: Props) {
  const [currentQuery, setCurrentQuery] = useState<UsersQueryState>(() => {
    if (typeof window === "undefined") {
      return {
        query: "",
        role: null,
        status: null,
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
      };
    }

    return parseUsersQuery(new URLSearchParams(window.location.search));
  });
  const [formState, setFormState] = useState<FilterFormState>(() => toFormState(currentQuery));
  const [data, setData] = useState<UsersApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBusyUserId, setStatusBusyUserId] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setCurrentQuery(parseUsersQuery(new URLSearchParams(window.location.search)));
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

  const tableMessage =
    loading && data === null
      ? { tone: "muted", text: "Loading users..." }
      : !loading && error
        ? { tone: "error", text: error }
        : !loading && !error && users.length === 0
          ? { tone: "muted", text: "No users found." }
          : null;

  const replaceQuery = (next: UsersQueryState) => {
    const nextQueryString = toQueryString(next);
    const nextUrl = nextQueryString.length > 0 ? `${window.location.pathname}?${nextQueryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
    setCurrentQuery(next);
  };

  const onToggleStatus = async (userId: string, currentStatus: UserStatusFilter) => {
    const nextStatus: UserStatusFilter = currentStatus === "active" ? "disabled" : "active";
    setStatusBusyUserId(userId);
    setStatusHint(null);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json()) as ApiResponse<UpdateStatusApiData>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Failed to update status." : payload.error.message);
      }

      setData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          users: current.users.map((candidate) =>
            candidate.userId === userId ? { ...candidate, status: payload.data.user.status } : candidate,
          ),
        };
      });

      setStatusHint({ tone: "success", message: `Status updated to ${payload.data.user.status}.` });
    } catch (updateError) {
      setStatusHint({
        tone: "error",
        message: updateError instanceof Error ? updateError.message : "Failed to update status.",
      });
    } finally {
      setStatusBusyUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Users</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link href="/users/audit" prefetch={false}>
              View Audit Log
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Total: {pagination.total}
            {loading ? " · Loading..." : ""}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusHint ? (
          <p
            className={cn(
              "text-xs",
              statusHint.tone === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {statusHint.message}
          </p>
        ) : null}

        <form
          className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-5"
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
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2">
            <span>Search Email</span>
            <Input
              type="text"
              name="query"
              value={formState.query}
              onChange={(event) => setFormState((current) => ({ ...current, query: event.target.value }))}
              placeholder="user@example.com"
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Role</span>
            <Select
              value={formState.role || ALL_FILTERS_VALUE}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, role: value === ALL_FILTERS_VALUE ? "" : value }))
              }
            >
              <SelectTrigger className="w-full" aria-label="Role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTERS_VALUE}>All roles</SelectItem>
                <SelectItem value="viewer">viewer</SelectItem>
                <SelectItem value="operator">operator</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Status</span>
            <Select
              value={formState.status || ALL_FILTERS_VALUE}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, status: value === ALL_FILTERS_VALUE ? "" : value }))
              }
            >
              <SelectTrigger className="w-full" aria-label="Status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTERS_VALUE}>All statuses</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Page Size</span>
            <Select value={formState.pageSize} onValueChange={(value) => setFormState((current) => ({ ...current, pageSize: value }))}>
              <SelectTrigger className="w-full" aria-label="Page Size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-center justify-end gap-2 md:col-span-5">
            <Button
              variant="secondary"
              onClick={() => {
                setFormState({
                  query: "",
                  role: "",
                  status: "",
                  pageSize: String(DEFAULT_PAGE_SIZE),
                });
                window.history.replaceState(null, "", window.location.pathname);
                setCurrentQuery({
                  query: "",
                  role: null,
                  status: null,
                  page: DEFAULT_PAGE,
                  pageSize: DEFAULT_PAGE_SIZE,
                });
              }}
            >
              Reset
            </Button>
            <Button type="submit">Apply</Button>
          </div>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 text-center">Email</TableHead>
              <TableHead className="text-center">User ID</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Last Login</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableMessage ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className={cn("py-6 text-center", tableMessage.tone === "error" ? "text-destructive" : "text-muted-foreground")}
                >
                  {tableMessage.text}
                </TableCell>
              </TableRow>
            ) : null}

            {!error
              ? users.map((user) => {
                  const isCurrentAccount = user.userId === currentUserId && user.status === "active";
                  const statusBusy = statusBusyUserId === user.userId;

                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="py-3 text-center font-medium">{user.email}</TableCell>
                      <TableCell className="py-3 text-center font-mono text-xs text-muted-foreground">{user.userId}</TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge>
                      </TableCell>
                      <TableCell className="py-3 text-center">{formatDateTime(user.lastLoginAt)}</TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
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
                          <Button
                            size="sm"
                            variant={
                              isCurrentAccount ? "outline" : user.status === "active" ? "destructive" : "default"
                            }
                            className="min-w-[96px]"
                            onClick={() => {
                              void onToggleStatus(user.userId, user.status);
                            }}
                            disabled={statusBusy || isCurrentAccount}
                          >
                            {statusBusy
                              ? "Updating..."
                              : isCurrentAccount
                                ? "Current Account"
                                : user.status === "active"
                                  ? "Disable"
                                  : "Enable"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0">
        <div className="flex w-full items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p>
            Showing {rangeStart}-{rangeEnd} of {pagination.total}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!hasPrevious) {
                  return;
                }

                replaceQuery({ ...currentQuery, page: currentPage - 1 });
              }}
              disabled={!hasPrevious}
            >
              Previous
            </Button>

            <span>
              Page {currentPage} / {totalPages}
            </span>

            <Button
              variant="secondary"
              onClick={() => {
                if (!hasNext) {
                  return;
                }

                replaceQuery({ ...currentQuery, page: currentPage + 1 });
              }}
              disabled={!hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
