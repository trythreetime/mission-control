import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  AlertSeverity,
  AlertStatus,
  EventLevel,
  JobPriority,
  JobStatus,
  NodeStatus,
  PrismaClient,
} from "@prisma/client";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

async function seedNodes() {
  const nodeCount = await prisma.node.count();
  if (nodeCount > 0) return;
  await prisma.node.createMany({
    data: [
      { nodeKey: "node-us-east-01", name: "US East 01", region: "us-east", status: NodeStatus.online, cpuPct: 34, memPct: 52, latencyMs: 18, lastHeartbeatAt: minutesAgo(1) },
      { nodeKey: "node-us-west-01", name: "US West 01", region: "us-west", status: NodeStatus.degraded, cpuPct: 67, memPct: 74, latencyMs: 86, lastHeartbeatAt: minutesAgo(2) },
      { nodeKey: "node-eu-west-01", name: "EU West 01", region: "eu-west", status: NodeStatus.online, cpuPct: 41, memPct: 58, latencyMs: 23, lastHeartbeatAt: minutesAgo(1) },
    ],
  });
}

async function seedJobs() {
  const jobCount = await prisma.job.count();
  if (jobCount > 0) return;
  const nodes = await prisma.node.findMany({ orderBy: { createdAt: "asc" }, take: 3, select: { id: true } });
  await prisma.job.createMany({
    data: [
      { jobNo: "JOB-1042", name: "Sync telemetry", type: "telemetry", status: JobStatus.running, priority: JobPriority.high, owner: "system", queuedAt: minutesAgo(15), startedAt: minutesAgo(12), nodeId: nodes[0]?.id },
      { jobNo: "JOB-1041", name: "Nightly backup", type: "backup", status: JobStatus.queued, priority: JobPriority.normal, owner: "ops", queuedAt: minutesAgo(20), nodeId: nodes[1]?.id },
      { jobNo: "JOB-1039", name: "Deploy edge config", type: "deploy", status: JobStatus.failed, priority: JobPriority.critical, owner: "devops", queuedAt: minutesAgo(45), startedAt: minutesAgo(40), finishedAt: minutesAgo(35), errorMessage: "Failed on step 3: checksum mismatch", nodeId: nodes[2]?.id },
    ],
  });
}

async function seedEvents() {
  const eventCount = await prisma.event.count();
  if (eventCount > 0) return;
  const [jobs, nodes] = await Promise.all([
    prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, jobNo: true } }),
    prisma.node.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, nodeKey: true } }),
  ]);
  await prisma.event.createMany({
    data: [
      { eventType: "job.started", level: EventLevel.info, message: `Job ${jobs[0]?.jobNo ?? "JOB-1042"} started`, createdAt: minutesAgo(12), jobId: jobs[0]?.id, nodeId: nodes[0]?.id },
      { eventType: "node.latency", level: EventLevel.warn, message: `${nodes[1]?.nodeKey ?? "node-us-west-01"} latency spike detected`, createdAt: minutesAgo(8), nodeId: nodes[1]?.id },
      { eventType: "job.failed", level: EventLevel.error, message: `Job ${jobs[2]?.jobNo ?? "JOB-1039"} failed on deployment step`, createdAt: minutesAgo(35), jobId: jobs[2]?.id, nodeId: nodes[2]?.id },
    ],
  });
}

async function seedAlerts() {
  const alertCount = await prisma.alert.count();
  if (alertCount > 0) return;
  await prisma.alert.createMany({
    data: [
      { alertNo: "ALT-301", sourceType: "node", sourceId: "node-us-west-01", severity: AlertSeverity.critical, status: AlertStatus.open, title: "Disk usage > 90%", description: "Persistent high disk pressure on node-us-west-01." },
      { alertNo: "ALT-299", sourceType: "queue", sourceId: "queue/default", severity: AlertSeverity.high, status: AlertStatus.acknowledged, title: "Job failure burst", description: "Multiple failures detected in the last hour." },
      { alertNo: "ALT-295", sourceType: "node", sourceId: "node-us-east-01", severity: AlertSeverity.medium, status: AlertStatus.open, title: "Heartbeat jitter", description: "Heartbeat interval variance above threshold." },
    ],
  });
}

async function main() {
  await seedNodes();
  await seedJobs();
  await seedEvents();
  await seedAlerts();
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
