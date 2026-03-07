import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { getEvents } from "@/lib/services/events.service";

const EVENT_LEVELS = ["info", "warn", "error"] as const;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  level: z.enum(EVENT_LEVELS).optional(),
  query: z.string().trim().max(200).optional(),
});

export async function GET(request: Request) {
  const session = await requireApiRole("viewer");
  if (session instanceof Response) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const query = searchParams.get("query");

  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    level: level && level.trim().length > 0 ? level : undefined,
    query: query ?? undefined,
  });

  if (!parsed.success) {
    return apiError("INVALID_EVENTS_QUERY", "Invalid events query parameters.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const events = await getEvents(parsed.data.limit, parsed.data.level, parsed.data.query);
    return apiSuccess({ events });
  } catch (error) {
    return apiError("EVENTS_FETCH_FAILED", "Failed to load events.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
