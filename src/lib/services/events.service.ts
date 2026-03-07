import "server-only";

import { db } from "@/lib/db";
import { toClockTime } from "@/lib/services/shared";
import type { DashboardEvent } from "@/lib/services/types";

export async function getEvents(
  limit = 100,
  level?: "info" | "warn" | "error",
  query?: string,
): Promise<DashboardEvent[]> {
  const normalizedQuery = query?.trim();

  const events = await db.event.findMany({
    where: {
      ...(level ? { level } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { message: { contains: normalizedQuery, mode: "insensitive" } },
              { eventType: { contains: normalizedQuery, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      level: true,
      message: true,
      createdAt: true,
    },
  });

  return events.map((event) => ({
    id: event.id,
    time: toClockTime(event.createdAt),
    level: event.level.toUpperCase(),
    message: event.message,
  }));
}
