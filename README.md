# Mission Control Dashboard (MVP)

A scaffolded mission control console built with Next.js + TypeScript + Tailwind.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Routes

- `/` Overview
- `/jobs` Jobs Queue
- `/nodes` Nodes Monitor
- `/events` Event Stream
- `/alerts` Alerts Center

## Project Structure

```txt
src/
  app/
    page.tsx
    jobs/page.tsx
    nodes/page.tsx
    events/page.tsx
    alerts/page.tsx
    layout.tsx
    globals.css
  components/
    sidebar.tsx
    topbar.tsx
  lib/
    mock-data.ts
```

## Next Steps

1. Replace mock data with PostgreSQL + Prisma models (`jobs`, `nodes`, `events`, `alerts`).
2. Add Auth.js role-based access (admin/operator/viewer).
3. Add WebSocket stream for live event updates.
4. Add retry/cancel actions for jobs.
5. Add charts and SLA panels.
