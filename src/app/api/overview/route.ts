import { apiError, apiSuccess } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/guards";
import { getOverviewStats } from "@/lib/services/overview.service";
import { getRecentJobs } from "@/lib/services/jobs.service";

type OverviewPayload = {
  overviewStats: Awaited<ReturnType<typeof getOverviewStats>>;
  jobs: Awaited<ReturnType<typeof getRecentJobs>>;
};

export async function GET() {
  const session = await requireApiRole("viewer");
  if (session instanceof Response) {
    return session;
  }

  try {
    const [overviewStats, jobs] = await Promise.all([getOverviewStats(), getRecentJobs()]);
    const payload: OverviewPayload = { overviewStats, jobs };
    return apiSuccess(payload);
  } catch (error) {
    return apiError("OVERVIEW_FETCH_FAILED", "Failed to load overview data.", {
      status: 500,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
