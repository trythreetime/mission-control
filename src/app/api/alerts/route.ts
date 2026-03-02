import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { getAlerts } from "@/lib/services/alerts.service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: Request) {
  const session = await requireApiRole("viewer");
  if (session instanceof Response) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiError("INVALID_ALERTS_QUERY", "Invalid alerts query parameters.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const alerts = await getAlerts(parsed.data.limit);
    return apiSuccess({ alerts });
  } catch (error) {
    return apiError("ALERTS_FETCH_FAILED", "Failed to load alerts.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
