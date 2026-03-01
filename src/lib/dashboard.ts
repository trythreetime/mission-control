// Backward-compatible barrel. Prefer importing from @/lib/services/* directly.
export type {
  OverviewStat,
  DashboardJob,
  DashboardNode,
  DashboardEvent,
  DashboardAlert,
} from "@/lib/services/types";

export { getOverviewStats } from "@/lib/services/overview.service";
export { getRecentJobs } from "@/lib/services/jobs.service";
export { getNodes } from "@/lib/services/nodes.service";
export { getEvents } from "@/lib/services/events.service";
export { getAlerts, acknowledgeAlert } from "@/lib/services/alerts.service";
