import { headers } from "next/headers";

import { JobsTableClient } from "@/components/jobs-table-client";
import type { ApiResponse } from "@/lib/api-response";
import type { DashboardJob } from "@/lib/services/types";

type JobsApiData = {
  jobs: DashboardJob[];
};

const jobsFallback: JobsApiData = {
  jobs: [],
};

async function getJobsData(): Promise<JobsApiData> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const cookieHeader = requestHeaders.get("cookie");

    if (!host) {
      return jobsFallback;
    }

    const response = await fetch(`${protocol}://${host}/api/jobs?limit=100`, {
      cache: "no-store",
      ...(cookieHeader ? { headers: { cookie: cookieHeader } } : {}),
    });

    if (!response.ok) {
      return jobsFallback;
    }

    const payload = (await response.json()) as ApiResponse<JobsApiData>;
    return payload.ok ? payload.data : jobsFallback;
  } catch {
    return jobsFallback;
  }
}

export default async function JobsPage() {
  const { jobs } = await getJobsData();

  return <JobsTableClient jobs={jobs} />;
}
