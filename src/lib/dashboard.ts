import "server-only";

import {
  AlertSeverity,
  AlertStatus,
  JobStatus,
  NodeStatus,
} from "@prisma/client";
import { db } from "@/lib/db";

export type OverviewStat = {
  label: string;
  value: number | string;
  trend: string;
};

export type DashboardJob = {
  id: string;
  name: string;
  status: string;
  owner: string;
  eta: string;
};

export type DashboardNode = {
  id: string;
  region: string;
  status: string;
  cpu: string;
  mem: string;
  latency: string;
  heartbeat: string;
};

export type DashboardEvent = {
  id: string;
  time: string;
  level: string;
  message: string;
};

export type DashboardAlert = {
  id: string;
  severity: string;
  title: string;
  target: string;
  status: string;
};

function formatElapsed(from: Date): string {
  const diffMs = Math.max(0, Date.now() - from.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);

  if (totalMinutes < 1) {
    return "<1m";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

function toEta(status: string, queuedAt: Date, startedAt: Date | null, finishedAt: Date | null): string {
  if (finishedAt) {
    return "--";
  }

  if (status === JobStatus.running) {
    const started = startedAt ?? queuedAt;
    return `${formatElapsed(started)} elapsed`;
  }

  if (status === JobStatus.queued) {
    return `${formatElapsed(queuedAt)} waiting`;
  }

  return "--";
}

function toPercent(value: number | null): string {
  return value === null ? "--" : `${value}%`;
}

function toLatency(value: number | null): string {
  return value === null ? "--" : `${value}ms`;
}

function toHeartbeat(lastHeartbeatAt: Date | null): string {
  if (!lastHeartbeatAt) {
    return "never";
  }
  return `${formatElapsed(lastHeartbeatAt)} ago`;
}

function toClockTime(at: Date): string {
  return at.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function getOverviewStats(): Promise<OverviewStat[]> {
  const [totalNodes, onlineNodes, totalJobs, queuedJobs, runningJobs, failedJobs, openAlerts, criticalOpenAlerts] =
    await Promise.all([
      db.node.count(),
      db.node.count({ where: { status: NodeStatus.online } }),
      db.job.count(),
      db.job.count({ where: { status: JobStatus.queued } }),
      db.job.count({ where: { status: JobStatus.running } }),
      db.job.count({ where: { status: JobStatus.failed } }),
      db.alert.count({ where: { status: AlertStatus.open } }),
      db.alert.count({
        where: {
          status: AlertStatus.open,
          severity: AlertSeverity.critical,
        },
      }),
    ]);

  const failureRate = totalJobs === 0 ? "0.0%" : `${((failedJobs / totalJobs) * 100).toFixed(1)}%`;
  const nonOnlineNodes = Math.max(0, totalNodes - onlineNodes);

  return [
    {
      label: "Online Nodes",
      value: onlineNodes,
      trend: `${nonOnlineNodes} offline/degraded`,
    },
    {
      label: "Queued Jobs",
      value: queuedJobs,
      trend: `${runningJobs} running`,
    },
    {
      label: "Failure Rate",
      value: failureRate,
      trend: `${failedJobs} failed of ${totalJobs}`,
    },
    {
      label: "Open Alerts",
      value: openAlerts,
      trend: `${criticalOpenAlerts} critical`,
    },
  ];
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

export async function getNodes(limit = 100): Promise<DashboardNode[]> {
  const nodes = await db.node.findMany({
    orderBy: [{ status: "asc" }, { lastHeartbeatAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      nodeKey: true,
      region: true,
      status: true,
      cpuPct: true,
      memPct: true,
      latencyMs: true,
      lastHeartbeatAt: true,
    },
  });

  return nodes.map((node) => ({
    id: node.nodeKey,
    region: node.region,
    status: node.status,
    cpu: toPercent(node.cpuPct),
    mem: toPercent(node.memPct),
    latency: toLatency(node.latencyMs),
    heartbeat: toHeartbeat(node.lastHeartbeatAt),
  }));
}

export async function getEvents(limit = 100): Promise<DashboardEvent[]> {
  const events = await db.event.findMany({
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

export async function getAlerts(limit = 100): Promise<DashboardAlert[]> {
  const alerts = await db.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      alertNo: true,
      severity: true,
      title: true,
      sourceId: true,
      status: true,
    },
  });

  return alerts.map((alert) => ({
    id: alert.alertNo,
    severity: alert.severity,
    title: alert.title,
    target: alert.sourceId,
    status: alert.status,
  }));
}

export async function acknowledgeAlert(alertNo: string): Promise<void> {
  await db.alert.updateMany({
    where: {
      alertNo,
      status: AlertStatus.open,
    },
    data: {
      status: AlertStatus.acknowledged,
      ackBy: "rainy",
      ackAt: new Date(),
    },
  });
}
