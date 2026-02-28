import { alerts } from "@/lib/mock-data";

export default function AlertsPage() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Alerts Center</h2>
      <div className="space-y-2 text-sm">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
            <p className="font-medium">{alert.id} · {alert.title}</p>
            <p className="text-slate-300">Severity: {alert.severity} · Target: {alert.target}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
