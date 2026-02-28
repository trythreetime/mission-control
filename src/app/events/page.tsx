import { events } from "@/lib/mock-data";

export default function EventsPage() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-4 text-lg font-semibold">Event Stream</h2>
      <ul className="space-y-2 text-sm">
        {events.map((event, i) => (
          <li key={i} className="rounded-md bg-black/20 px-3 py-2">
            <span className="mr-2 text-slate-400">{event.time}</span>
            <span className="mr-2 text-cyan-300">[{event.level}]</span>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
