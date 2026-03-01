import { JobStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getRecentJobs } from "@/lib/services/jobs.service";

const jobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  status: z.nativeEnum(JobStatus).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = searchParams.get("limit");

  const parsedQuery = jobsQuerySchema.safeParse({
    limit: limit ?? undefined,
    status: status && status.trim().length > 0 ? status : undefined,
  });

  if (!parsedQuery.success) {
    return apiError("INVALID_JOBS_QUERY", "Invalid jobs query parameters.", {
      status: 400,
      details: parsedQuery.error.flatten(),
    });
  }

  try {
    const jobs = await getRecentJobs(parsedQuery.data.limit, parsedQuery.data.status);
    return apiSuccess({ jobs });
  } catch (error) {
    return apiError("JOBS_FETCH_FAILED", "Failed to load jobs.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
