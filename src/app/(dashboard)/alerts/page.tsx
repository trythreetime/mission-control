import { headers } from "next/headers";

import { AlertsListClient } from "@/components/alerts-list-client";
import { hasRoleAtLeast } from "@/lib/auth/roles";
import { requireAppSession } from "@/lib/auth/session";
import type { ApiResponse } from "@/lib/api-response";
import type { DashboardAlert } from "@/lib/services/types";

type AlertsApiData = {
  alerts: DashboardAlert[];
};

const fallback: AlertsApiData = { alerts: [] };

async function getAlertsData(): Promise<AlertsApiData> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";
    const cookieHeader = h.get("cookie");
    if (!host) return fallback;

    const res = await fetch(`${protocol}://${host}/api/alerts?limit=100`, {
      cache: "no-store",
      ...(cookieHeader ? { headers: { cookie: cookieHeader } } : {}),
    });
    if (!res.ok) return fallback;

    const payload = (await res.json()) as ApiResponse<AlertsApiData>;
    return payload.ok ? payload.data : fallback;
  } catch {
    return fallback;
  }
}

export default async function AlertsPage() {
  const session = await requireAppSession();
  const { alerts } = await getAlertsData();

  return (
    <AlertsListClient
      initialAlerts={alerts}
      canAcknowledge={hasRoleAtLeast(session.role, "operator")}
    />
  );
}
