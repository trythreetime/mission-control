import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { listUserAuditLogs, USER_AUDIT_ACTIONS } from "@/lib/services/users.service";
import { toApiProfileStatus } from "@/lib/users-status";

const querySchema = z.object({
  targetEmail: z.string().trim().optional(),
  actorEmail: z.string().trim().optional(),
  action: z.enum(USER_AUDIT_ACTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  const session = await requireApiRole("admin");
  if (session instanceof Response) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    targetEmail: searchParams.get("targetEmail") ?? undefined,
    actorEmail: searchParams.get("actorEmail") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return apiError("INVALID_USER_AUDIT_QUERY", "Invalid user audit query parameters.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const data = await listUserAuditLogs({
      targetEmail:
        parsed.data.targetEmail && parsed.data.targetEmail.length > 0 ? parsed.data.targetEmail : undefined,
      actorEmail: parsed.data.actorEmail && parsed.data.actorEmail.length > 0 ? parsed.data.actorEmail : undefined,
      action: parsed.data.action,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return apiSuccess({
      ...data,
      logs: data.logs.map((log) => ({
        ...log,
        statusBefore: log.statusBefore ? toApiProfileStatus(log.statusBefore) : null,
        statusAfter: log.statusAfter ? toApiProfileStatus(log.statusAfter) : null,
      })),
    });
  } catch (error) {
    return apiError("USER_AUDIT_FETCH_FAILED", "Failed to load user audit logs.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
