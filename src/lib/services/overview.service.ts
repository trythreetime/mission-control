import "server-only";

import { db } from "@/lib/db";
import type { OverviewStat } from "@/lib/services/types";

export async function getOverviewStats(): Promise<OverviewStat[]> {
  const [totalNodes, onlineNodes, totalJobs, queuedJobs, runningJobs, failedJobs, openAlerts, criticalOpenAlerts] =
    await Promise.all([
      db.node.count(),
      db.node.count({ where: { status: "online" } }),
      db.job.count(),
      db.job.count({ where: { status: "queued" } }),
      db.job.count({ where: { status: "running" } }),
      db.job.count({ where: { status: "failed" } }),
      db.alert.count({ where: { status: "open" } }),
      db.alert.count({
        where: { status: "open", severity: "critical" },
      }),
    ]);

  const failureRate = totalJobs === 0 ? "0.0%" : `${((failedJobs / totalJobs) * 100).toFixed(1)}%`;
  const nonOnlineNodes = Math.max(0, totalNodes - onlineNodes);

  return [
    { label: "Online Nodes", value: onlineNodes, trend: `${nonOnlineNodes} offline/degraded` },
    { label: "Queued Jobs", value: queuedJobs, trend: `${runningJobs} running` },
    { label: "Failure Rate", value: failureRate, trend: `${failedJobs} failed of ${totalJobs}` },
    { label: "Open Alerts", value: openAlerts, trend: `${criticalOpenAlerts} critical` },
  ];
}
