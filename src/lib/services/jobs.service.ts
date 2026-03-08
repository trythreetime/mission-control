import "server-only";

import type { JobPriority, Prisma } from "@prisma/client";
import { EventLevel } from "@prisma/client";

import { db } from "@/lib/db";
import { formatElapsed } from "@/lib/services/shared";
import type { DashboardJob } from "@/lib/services/types";

type JobStatusValue = "queued" | "running" | "success" | "failed" | "canceled";
const JOB_STATUSES: JobStatusValue[] = ["queued", "running", "success", "failed", "canceled"];

type CreateJobInput = {
  name: string;
  type: string;
  owner: string;
  priority: JobPriority;
  payload?: Prisma.InputJsonValue;
};

function toEta(status: JobStatusValue, queuedAt: Date, startedAt: Date | null, finishedAt: Date | null): string {
  if (finishedAt) return "--";
  if (status === "running") {
    const started = startedAt ?? queuedAt;
    return `${formatElapsed(started)} elapsed`;
  }
  if (status === "queued") return `${formatElapsed(queuedAt)} waiting`;
  return "--";
}

function toDashboardJob(job: {
  jobNo: string;
  name: string;
  status: JobStatusValue;
  owner: string;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}): DashboardJob {
  return {
    id: job.jobNo,
    name: job.name,
    status: job.status,
    owner: job.owner,
    eta: toEta(job.status, job.queuedAt, job.startedAt, job.finishedAt),
  };
}

async function getNextJobNo(): Promise<string> {
  const latestJob = await db.job.findFirst({
    orderBy: [{ createdAt: "desc" }, { jobNo: "desc" }],
    select: { jobNo: true },
  });

  const matchedNumber = latestJob?.jobNo.match(/(\d+)$/)?.[1];
  const nextNumber = matchedNumber ? Number.parseInt(matchedNumber, 10) + 1 : 1000;
  return `JOB-${String(nextNumber).padStart(4, "0")}`;
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

  return recentJobs.map(toDashboardJob);
}

export async function createJob(input: CreateJobInput): Promise<DashboardJob> {
  const jobNo = await getNextJobNo();

  const createdJob = await db.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        jobNo,
        name: input.name,
        type: input.type,
        owner: input.owner,
        priority: input.priority,
        status: "queued",
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
      },
      select: {
        id: true,
        jobNo: true,
        name: true,
        status: true,
        owner: true,
        queuedAt: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    await tx.event.create({
      data: {
        eventType: "job.queued",
        level: EventLevel.info,
        message: `Job ${job.jobNo} created by ${job.owner}`,
        jobId: job.id,
      },
    });

    return job;
  });

  return toDashboardJob(createdJob);
}
