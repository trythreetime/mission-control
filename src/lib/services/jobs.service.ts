import "server-only";

import { db } from "@/lib/db";
import { formatElapsed } from "@/lib/services/shared";
import type { DashboardJob } from "@/lib/services/types";

type JobStatusValue = "queued" | "running" | "success" | "failed" | "canceled";

function toEta(status: JobStatusValue, queuedAt: Date, startedAt: Date | null, finishedAt: Date | null): string {
  if (finishedAt) return "--";
  if (status === "running") {
    const started = startedAt ?? queuedAt;
    return `${formatElapsed(started)} elapsed`;
  }
  if (status === "queued") return `${formatElapsed(queuedAt)} waiting`;
  return "--";
}

export async function getRecentJobs(limit = 5, status?: JobStatusValue): Promise<DashboardJob[]> {
  const recentJobs = await db.job.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      jobNo: true,
      name: true,
      status: true,
      owner: true,
      queuedAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  return recentJobs.map((job) => ({
    id: job.jobNo,
    name: job.name,
    status: job.status,
    owner: job.owner,
    eta: toEta(job.status, job.queuedAt, job.startedAt, job.finishedAt),
  }));
}
