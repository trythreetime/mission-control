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
    const cookieHeader = h.get("cookie");
    if (!host) return fallback;

    const res = await fetch(`${protocol}://${host}/api/nodes?limit=100`, {
      cache: "no-store",
      ...(cookieHeader ? { headers: { cookie: cookieHeader } } : {}),
    });
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
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <h2 className="mb-4 text-lg font-semibold text-white">Nodes Monitor</h2>
      <div className="space-y-3">
        {nodes.length === 0 ? <p className="text-sm text-slate-400">No nodes found.</p> : null}
        {nodes.map((node) => (
          <div key={node.id} className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-slate-100">
                {node.id} · {node.region}
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                {node.status}
              </span>
            </div>
            <p className="text-slate-300">
              CPU {node.cpu} · MEM {node.mem} · LAT {node.latency} · heartbeat {node.heartbeat}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
