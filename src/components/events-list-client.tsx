"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApiResponse } from "@/lib/api-response";
import type { DashboardEvent } from "@/lib/services/types";

type EventsApiData = {
  events: DashboardEvent[];
};

const EVENTS_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 400;
const ALL_LEVELS_VALUE = "all";
const EVENT_LEVEL_OPTIONS = ["info", "warn", "error"] as const;

export function EventsListClient() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [level, setLevel] = useState(() => searchParams.get("level") ?? ALL_LEVELS_VALUE);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.delete("query");
    nextParams.delete("level");

    const normalizedQuery = debouncedQuery.trim();
    if (normalizedQuery.length > 0) {
      nextParams.set("query", normalizedQuery);
    }

    if (level !== ALL_LEVELS_VALUE) {
      nextParams.set("level", level);
    }

    const current = searchParams.toString();
    const next = nextParams.toString();

    if (current !== next) {
      router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedQuery, level, pathname, router, searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: String(EVENTS_LIMIT) });
        const normalizedQuery = debouncedQuery.trim();

        if (normalizedQuery.length > 0) {
          params.set("query", normalizedQuery);
        }

        if (level !== ALL_LEVELS_VALUE) {
          params.set("level", level);
        }

        const response = await fetch(`/api/events?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as ApiResponse<EventsApiData>;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? `HTTP ${response.status}` : payload.error.message);
        }

        setEvents(payload.data.events);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load events.");
        setEvents([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    };

    void loadEvents();

    return () => controller.abort();
  }, [debouncedQuery, level]);

  const hasActiveFilters = debouncedQuery.trim().length > 0 || level !== ALL_LEVELS_VALUE;

  const listMessage =
    loading && !hasLoaded
      ? { tone: "muted", text: "Loading events..." }
      : !loading && error
        ? { tone: "error", text: error }
        : !loading && !error && events.length === 0
          ? {
              tone: "muted",
              text: hasActiveFilters
                ? "No events match the current filters. Try adjusting keyword or level."
                : "No events found.",
            }
          : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <h2 className="mb-4 text-lg font-semibold text-white">Event Stream</h2>

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search message/event type..."
          aria-label="Search events"
          className="border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-400 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20"
        />

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger
            className="border-white/15 bg-black/20 text-slate-100 data-[placeholder]:text-slate-400"
            aria-label="Filter level"
          >
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LEVELS_VALUE}>All levels</SelectItem>
            {EVENT_LEVEL_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => {
            setQuery("");
            setLevel(ALL_LEVELS_VALUE);
          }}
          className="rounded-md border border-white/15 bg-black/20 px-3 text-sm text-slate-200 transition hover:bg-white/10"
        >
          Reset
        </button>
      </div>

      {loading && hasLoaded ? (
        <p className="mb-4 text-xs text-slate-400" role="status">
          Searching events...
        </p>
      ) : null}

      <ul className="space-y-2 text-sm">
        {listMessage ? (
          <li className={listMessage.tone === "error" ? "text-rose-300" : "text-slate-400"}>{listMessage.text}</li>
        ) : null}

        {events.map((event) => (
          <li key={event.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
            <span className="mr-2 text-slate-400">{event.time}</span>
            <span className="mr-2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-slate-200">
              {event.level}
            </span>
            <span className="text-slate-200">{event.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
