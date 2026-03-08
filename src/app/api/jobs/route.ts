import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { createJob, getRecentJobs } from "@/lib/services/jobs.service";

const jobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  status: z.enum(["queued", "running", "success", "failed", "canceled"]).optional(),
  query: z.string().trim().max(200).optional(),
  owner: z.string().trim().max(200).optional(),
});

const createJobSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80),
  owner: z.string().trim().min(2).max(80),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  payloadText: z.string().max(10_000).optional().default(""),
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

export async function POST(request: Request) {
  const session = await requireApiRole("operator");
  if (session instanceof Response) {
    return session;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", { status: 400 });
  }

  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_JOB_PAYLOAD", "Invalid job creation payload.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  let payload: Prisma.InputJsonValue | undefined;

  if (parsed.data.payloadText.trim().length > 0) {
    try {
      payload = JSON.parse(parsed.data.payloadText) as Prisma.InputJsonValue;
    } catch {
      return apiError("INVALID_JOB_JSON", "Payload must be valid JSON.", {
        status: 400,
      });
    }
  }

  try {
    const job = await createJob({
      name: parsed.data.name,
      type: parsed.data.type,
      owner: parsed.data.owner,
      priority: parsed.data.priority,
      ...(payload !== undefined ? { payload } : {}),
    });

    return apiSuccess({ job }, { status: 201 });
  } catch (error) {
    return apiError("JOB_CREATE_FAILED", "Failed to create job.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
