import "server-only";

import { db } from "@/lib/db";
import { toHeartbeat, toLatency, toPercent } from "@/lib/services/shared";
import type { DashboardNode } from "@/lib/services/types";

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
