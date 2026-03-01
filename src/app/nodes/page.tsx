import { headers } from "next/headers";

import type { ApiResponse } from "@/lib/api-response";
import type { DashboardNode } from "@/lib/services/types";

type NodesApiData = {
  nodes: DashboardNode[];
};

const fallback: NodesApiData = { nodes: [] };

async function getNodesData(): Promise<NodesApiData> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";
    if (!host) return fallback;

    const res = await fetch(`${protocol}://${host}/api/nodes?limit=100`, { cache: "no-store" });
    if (!res.ok) return fallback;

    const payload = (await res.json()) as ApiResponse<NodesApiData>;
    return payload.ok ? payload.data : fallback;
  } catch {
    return fallback;
  }
}

export default async function NodesPage() {
  const { nodes } = await getNodesData();

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Nodes Monitor</h2>
      <div className="space-y-3">
        {nodes.length === 0 ? <p className="text-sm text-slate-400">No nodes found.</p> : null}
        {nodes.map((node) => (
          <div key={node.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
            <p className="font-medium">
              {node.id} · {node.region}
            </p>
            <p className="mt-1 text-slate-300">
              STATUS {node.status} · CPU {node.cpu} · MEM {node.mem} · LAT {node.latency} · heartbeat {node.heartbeat}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
