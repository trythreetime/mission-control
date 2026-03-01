import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getEvents } from "@/lib/dashboard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiError("INVALID_EVENTS_QUERY", "Invalid events query parameters.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const events = await getEvents(parsed.data.limit);
    return apiSuccess({ events });
  } catch (error) {
    return apiError("EVENTS_FETCH_FAILED", "Failed to load events.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
