import { overviewStats, jobs } from "@/lib/mock-data";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-cyan-300">{stat.trend}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-base font-medium">Recent Jobs</h2>
        <div className="space-y-2 text-sm">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2">
              <span>{job.id} · {job.name}</span>
              <span className="text-slate-300">{job.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
