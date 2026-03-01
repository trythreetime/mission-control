import { headers } from "next/headers";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob, OverviewStat } from "@/lib/dashboard";
import { OverviewLive } from "@/components/overview-live";

export type OverviewApiData = {
  overviewStats: OverviewStat[];
  jobs: DashboardJob[];
};

const overviewFallback: OverviewApiData = {
  overviewStats: [],
  jobs: [],
};

async function getOverviewData(): Promise<OverviewApiData> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    if (!host) {
      return overviewFallback;
    }

    const response = await fetch(`${protocol}://${host}/api/overview`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return overviewFallback;
    }

    const payload = (await response.json()) as ApiResponse<OverviewApiData>;
    return payload.ok ? payload.data : overviewFallback;
  } catch {
    return overviewFallback;
  }
}

export default async function OverviewPage() {
  const initialData = await getOverviewData();
  return <OverviewLive initialData={initialData} />;
}
