import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { formatElapsed } from "@/lib/services/shared";
import type { DashboardJob } from "@/lib/services/types";

type JobStatusValue = "queued" | "running" | "success" | "failed" | "canceled";
const JOB_STATUSES: JobStatusValue[] = ["queued", "running", "success", "failed", "canceled"];

function toEta(status: JobStatusValue, queuedAt: Date, startedAt: Date | null, finishedAt: Date | null): string {
  if (finishedAt) return "--";
  if (status === "running") {
    const started = startedAt ?? queuedAt;
    return `${formatElapsed(started)} elapsed`;
  }
  if (status === "queued") return `${formatElapsed(queuedAt)} waiting`;
  return "--";
}

export async function getRecentJobs(
  limit = 5,
  status?: JobStatusValue,
  query?: string,
  owner?: string,
): Promise<DashboardJob[]> {
  const normalizedQuery = query?.trim();
  const normalizedOwner = owner?.trim();

  const matchingStatuses = normalizedQuery
    ? JOB_STATUSES.filter((statusValue) => statusValue.includes(normalizedQuery.toLowerCase()))
    : [];

  const where: Prisma.JobWhereInput = {
    ...(status ? { status } : {}),
    ...(normalizedOwner
      ? {
          owner: {
            contains: normalizedOwner,
            mode: "insensitive",
          },
        }
      : {}),
    ...(normalizedQuery
      ? {
          OR: [
            { id: { contains: normalizedQuery, mode: "insensitive" } },
            { jobNo: { contains: normalizedQuery, mode: "insensitive" } },
            { name: { contains: normalizedQuery, mode: "insensitive" } },
            { owner: { contains: normalizedQuery, mode: "insensitive" } },
            { type: { contains: normalizedQuery, mode: "insensitive" } },
            ...(matchingStatuses.length > 0 ? [{ status: { in: matchingStatuses } }] : []),
          ],
        }
      : {}),
  };

  const recentJobs = await db.job.findMany({
    where,
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
