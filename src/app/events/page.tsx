import { getEvents } from "@/lib/dashboard";

export default async function EventsPage() {
  const events = await getEvents(100);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Event Stream</h2>
      <ul className="space-y-2 text-sm">
        {events.length === 0 ? <li className="text-slate-400">No events found.</li> : null}
        {events.map((event) => (
          <li key={event.id} className="rounded-md bg-black/20 px-3 py-2">
            <span className="mr-2 text-slate-400">{event.time}</span>
            <span className="mr-2 text-cyan-300">[{event.level}]</span>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
