import { revalidatePath } from "next/cache";
import { acknowledgeAlert, getAlerts } from "@/lib/dashboard";

async function acknowledgeOpenAlert(formData: FormData) {
  "use server";

  const alertNo = formData.get("alertNo");
  if (typeof alertNo !== "string" || alertNo.length === 0) {
    return;
  }

  await acknowledgeAlert(alertNo);
  revalidatePath("/alerts");
}

export default async function AlertsPage() {
  const alerts = await getAlerts(100);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Alerts Center</h2>
      <div className="space-y-2 text-sm">
        {alerts.length === 0 ? <p className="text-slate-400">No alerts found.</p> : null}
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
            <p className="font-medium">
              {alert.id} · {alert.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-300">
              <p>
                Severity: {alert.severity} · Status: {alert.status} · Target: {alert.target}
              </p>
              {alert.status === "open" ? (
                <form action={acknowledgeOpenAlert}>
                  <input type="hidden" name="alertNo" value={alert.id} />
                  <button
                    type="submit"
                    className="rounded border border-cyan-400/50 px-2 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-400/10"
                  >
                    Acknowledge
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
