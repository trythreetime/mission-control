import "server-only";

import { JobStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { formatElapsed } from "@/lib/services/shared";
import type { DashboardJob } from "@/lib/services/types";

function toEta(status: string, queuedAt: Date, startedAt: Date | null, finishedAt: Date | null): string {
  if (finishedAt) return "--";
  if (status === JobStatus.running) {
    const started = startedAt ?? queuedAt;
    return `${formatElapsed(started)} elapsed`;
  }
  if (status === JobStatus.queued) return `${formatElapsed(queuedAt)} waiting`;
  return "--";
}

export async function getRecentJobs(limit = 5, status?: JobStatus): Promise<DashboardJob[]> {
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
