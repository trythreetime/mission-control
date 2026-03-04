import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { getRecentJobs } from "@/lib/services/jobs.service";

const jobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  status: z.enum(["queued", "running", "success", "failed", "canceled"]).optional(),
  query: z.string().trim().max(200).optional(),
  owner: z.string().trim().max(200).optional(),
});

export async function GET(request: Request) {
  const session = await requireApiRole("viewer");
  if (session instanceof Response) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = searchParams.get("limit");
  const query = searchParams.get("query");
  const owner = searchParams.get("owner");

  const parsedQuery = jobsQuerySchema.safeParse({
    limit: limit ?? undefined,
    status: status && status.trim().length > 0 ? status : undefined,
    query: query ?? undefined,
    owner: owner ?? undefined,
  });

  if (!parsedQuery.success) {
    return apiError("INVALID_JOBS_QUERY", "Invalid jobs query parameters.", {
      status: 400,
      details: parsedQuery.error.flatten(),
    });
  }

  try {
    const jobs = await getRecentJobs(
      parsedQuery.data.limit,
      parsedQuery.data.status,
      parsedQuery.data.query,
      parsedQuery.data.owner,
    );

    return apiSuccess({ jobs });
  } catch (error) {
    return apiError("JOBS_FETCH_FAILED", "Failed to load jobs.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
