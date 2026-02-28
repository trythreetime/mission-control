export const overviewStats = [
  { label: "Online Nodes", value: 12, trend: "+2 today" },
  { label: "Queued Jobs", value: 37, trend: "-8 from peak" },
  { label: "Failure Rate", value: "1.9%", trend: "stable" },
  { label: "Open Alerts", value: 3, trend: "2 critical" },
];

export const jobs = [
  { id: "JOB-1042", name: "Sync telemetry", status: "running", owner: "system", eta: "2m" },
  { id: "JOB-1041", name: "Nightly backup", status: "queued", owner: "ops", eta: "12m" },
  { id: "JOB-1039", name: "Deploy edge config", status: "failed", owner: "devops", eta: "--" },
];

export const nodes = [
  { id: "node-sh-01", region: "cn-east", cpu: "43%", mem: "61%", latency: "21ms", heartbeat: "5s ago" },
  { id: "node-hz-02", region: "cn-east", cpu: "28%", mem: "49%", latency: "17ms", heartbeat: "2s ago" },
  { id: "node-sg-01", region: "ap-sg", cpu: "66%", mem: "72%", latency: "84ms", heartbeat: "8s ago" },
];

export const events = [
  { time: "00:03:21", level: "INFO", message: "Job JOB-1042 started" },
  { time: "00:02:58", level: "WARN", message: "node-sg-01 latency spike detected" },
  { time: "00:01:44", level: "ERROR", message: "JOB-1039 failed on step 3" },
];

export const alerts = [
  { id: "ALT-301", severity: "critical", title: "Disk usage > 90%", target: "node-sh-01" },
  { id: "ALT-299", severity: "high", title: "Job failure burst", target: "queue/default" },
  { id: "ALT-295", severity: "medium", title: "Heartbeat jitter", target: "node-sg-01" },
];
