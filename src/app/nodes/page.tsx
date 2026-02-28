import { nodes } from "@/lib/mock-data";

export default function NodesPage() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Nodes Monitor</h2>
      <div className="space-y-3">
        {nodes.map((node) => (
          <div key={node.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
            <p className="font-medium">{node.id} · {node.region}</p>
            <p className="mt-1 text-slate-300">CPU {node.cpu} · MEM {node.mem} · LAT {node.latency} · heartbeat {node.heartbeat}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
