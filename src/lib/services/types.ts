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
