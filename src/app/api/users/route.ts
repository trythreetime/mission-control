import type { ProfileStatus, UserRole } from "@prisma/client";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { listUsers } from "@/lib/services/users.service";

const USER_ROLES = ["viewer", "operator", "admin"] as const;
const PROFILE_STATUSES = ["active", "disabled"] as const;

const querySchema = z.object({
  query: z.string().trim().optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(PROFILE_STATUSES).optional(),
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
    query: searchParams.get("query") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return apiError("INVALID_USERS_QUERY", "Invalid users query parameters.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const data = await listUsers({
      query: parsed.data.query && parsed.data.query.length > 0 ? parsed.data.query : undefined,
      role: parsed.data.role as UserRole | undefined,
      status: parsed.data.status as ProfileStatus | undefined,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return apiSuccess(data);
  } catch (error) {
    return apiError("USERS_FETCH_FAILED", "Failed to load users.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
