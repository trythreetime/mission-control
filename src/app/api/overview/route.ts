import { apiError, apiSuccess } from "@/lib/api-response";
import { getOverviewStats, getRecentJobs } from "@/lib/dashboard";

type OverviewPayload = {
  overviewStats: Awaited<ReturnType<typeof getOverviewStats>>;
  jobs: Awaited<ReturnType<typeof getRecentJobs>>;
};

export async function GET() {
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
