import { getRecentJobs } from "@/lib/dashboard";

export default async function JobsPage() {
  const jobs = await getRecentJobs(100);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Jobs Queue</h2>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Owner</th>
            <th>ETA</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr className="border-t border-white/10">
              <td colSpan={5} className="py-3 text-slate-400">
                No jobs found.
              </td>
            </tr>
          ) : null}
          {jobs.map((job) => (
            <tr key={job.id} className="border-t border-white/10">
              <td className="py-2">{job.id}</td>
              <td>{job.name}</td>
              <td>{job.status}</td>
              <td>{job.owner}</td>
              <td>{job.eta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
