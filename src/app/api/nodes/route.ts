import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getNodes } from "@/lib/services/nodes.service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiError("INVALID_NODES_QUERY", "Invalid nodes query parameters.", {
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  try {
    const nodes = await getNodes(parsed.data.limit);
    return apiSuccess({ nodes });
  } catch (error) {
    return apiError("NODES_FETCH_FAILED", "Failed to load nodes.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
