import "server-only";

import { db } from "@/lib/db";
import type { DashboardAlert } from "@/lib/services/types";

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
    where: { alertNo, status: "open" },
    data: {
      status: "acknowledged",
      ackBy: "rainy",
      ackAt: new Date(),
    },
  });
}
