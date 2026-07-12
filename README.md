# NexusCRM

Manage several personal Zalo accounts from one web UI: realtime chat, a contact
pipeline, appointments, reports and role-based access.

Design: [docs/superpowers/specs](docs/superpowers/specs/2026-07-12-nexuscrm-zalo-crm-design.md).
Phase checklists: [docs/superpowers/plans](docs/superpowers/plans/README.md).

## Layout

```text
apps/
  api/           Nest — REST + Socket.IO gateway. Stateless.
  zalo-worker/   Nest standalone, no HTTP — owns the zca-js pool.
  web/           Next.js
packages/
  db/            Drizzle schema, migrations, client factory
  contracts/     Zod: socket events, BullMQ job payloads
  api-types/     openapi-typescript output (generated, committed)
  ui/            shadcn
```

`api` and `zalo-worker` never call each other over HTTP — only through Redis
(spec §3.2).

## Running it

Postgres is hosted by Supabase, so there is no database container. Everything
else runs from compose:

```bash
cp .env.example .env   # fill in DATABASE_URL at minimum
docker compose up --build
```

- web — <http://localhost:3000>
- api — <http://localhost:3001>, Swagger at `/docs`

For day-to-day work, run the apps directly instead (`pnpm --filter api dev`,
`pnpm --filter web dev`, `pnpm --filter zalo-worker dev`) with a Redis on
`localhost:6379`.

## Types are declared once, on the backend

A response type is never written twice. It starts as a Drizzle table and reaches
React unchanged:

```text
Drizzle table -> drizzle-zod -> ZodDto -> Swagger -> /openapi.json
  -> openapi-typescript -> packages/api-types -> openapi-fetch + TanStack Query
```

`pnpm gen:api-types` reads `<API_URL>/openapi.json` from a **running** API, not
from source — so a frontend developer can regenerate against a deployed backend
branch without checking it out. Start the API first, then:

```bash
pnpm gen:api-types
```

Commit the regenerated `packages/api-types/schema.d.ts` in the same PR as the
DTO change. CI regenerates and diffs; stale types fail the build.

## Scripts

```bash
pnpm dev         # every app, in watch mode
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Migrations live in `packages/db`: `db:generate`, `db:migrate`, `db:studio`.
