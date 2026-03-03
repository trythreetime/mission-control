"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ApiResponse } from "@/lib/api-response";
import { cn } from "@/lib/utils";

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
const ALL_ACTIONS_VALUE = "__all";

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

  const tableMessage =
    loading && data === null
      ? { tone: "muted", text: "Loading audit logs..." }
      : !loading && error
        ? { tone: "error", text: error }
        : !loading && !error && logs.length === 0
          ? { tone: "muted", text: "No audit logs found." }
          : null;

  const replaceQuery = (next: AuditQueryState) => {
    const nextQueryString = toQueryString(next);
    const nextUrl = nextQueryString.length > 0 ? `${window.location.pathname}?${nextQueryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
    setCurrentQuery(next);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>User Audit Log</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="secondary">
            <Link href="/users" prefetch={false}>
              Back to Users
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Total: {pagination.total}
            {loading ? " · Loading..." : ""}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-5"
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
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2">
            <span>Target Email</span>
            <Input
              type="text"
              name="targetEmail"
              value={formState.targetEmail}
              onChange={(event) => setFormState((current) => ({ ...current, targetEmail: event.target.value }))}
              placeholder="target@example.com"
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2">
            <span>Actor Email</span>
            <Input
              type="text"
              name="actorEmail"
              value={formState.actorEmail}
              onChange={(event) => setFormState((current) => ({ ...current, actorEmail: event.target.value }))}
              placeholder="actor@example.com"
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Action</span>
            <Select
              value={formState.action || ALL_ACTIONS_VALUE}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, action: value === ALL_ACTIONS_VALUE ? "" : value }))
              }
            >
              <SelectTrigger className="w-full" aria-label="Action">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACTIONS_VALUE}>All actions</SelectItem>
                <SelectItem value="role_changed">role_changed</SelectItem>
                <SelectItem value="status_changed">status_changed</SelectItem>
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
            >
              Reset
            </Button>
            <Button type="submit">Apply</Button>
          </div>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 text-center">Time</TableHead>
              <TableHead className="text-center">Action</TableHead>
              <TableHead className="text-center">Target User</TableHead>
              <TableHead className="text-center">Actor User</TableHead>
              <TableHead className="text-center">Before</TableHead>
              <TableHead className="text-center">After</TableHead>
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
              ? logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="py-3 text-center">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="py-3 text-center">
                      <Badge variant={log.action === "status_changed" ? "secondary" : "default"}>{formatAction(log.action)}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="font-medium">{log.targetEmail}</div>
                      <div className="font-mono text-xs text-muted-foreground">{log.targetUserId}</div>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="font-medium">{log.actorEmail}</div>
                      <div className="font-mono text-xs text-muted-foreground">{log.actorUserId}</div>
                    </TableCell>
                    <TableCell className="py-3 text-center">{formatBeforeValue(log)}</TableCell>
                    <TableCell className="py-3 text-center">{formatAfterValue(log)}</TableCell>
                  </TableRow>
                ))
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
