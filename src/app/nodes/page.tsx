import { getNodes } from "@/lib/dashboard";

export default async function NodesPage() {
  const nodes = await getNodes(100);

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
