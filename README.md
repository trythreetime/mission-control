# Mission Control Dashboard (MVP)

A scaffolded mission control console built with Next.js + TypeScript + Tailwind.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Run locally

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

## Environment

Create `env.example` values in `.env`:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<supabase-anon-key>"
```

## Supabase Auth + RBAC

- Login supports either:
  - Email/password
  - Email OTP code
- Session cookies are managed by API routes:
  - `mc-access-token`
  - `mc-refresh-token`
- RBAC roles live in Prisma `profiles` table (`viewer`, `operator`, `admin`).
- First signed-in user is auto-provisioned as `admin`; later users default to `viewer`.
- API authorization rules:
  - All `GET /api/*` routes require `viewer+`
  - `PATCH /api/alerts/:id/ack` requires `operator/admin`

To promote users manually:

```sql
UPDATE profiles SET role = 'operator' WHERE email = 'operator@example.com';
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

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
    layout.tsx
    login/page.tsx
    (dashboard)/
      layout.tsx
      page.tsx
      jobs/page.tsx
      nodes/page.tsx
      events/page.tsx
      alerts/page.tsx
    api/auth/*
    globals.css
  components/
    sidebar.tsx
    topbar.tsx
  lib/
    auth/*
    services/*
```

## Next Steps

1. Add refresh-token rotation and session refresh in auth guards.
2. Add WebSocket stream for live event updates.
3. Add retry/cancel actions for jobs.
4. Add charts and SLA panels.
