# zalo-worker

NexusCRM Zalo worker, scaffolded with the Nest CLI and converted to a
standalone application context — no HTTP listener. It will own the zca-js
session pool from Phase 3 on; today it consumes BullMQ jobs and proves the
`api → worker` path.

`api` and `zalo-worker` never call each other over HTTP (spec §3.2). The api
enqueues BullMQ jobs; this process consumes them. Queue names and job payload
schemas are declared once in `@workspace/contracts`, and a consumer parses
every payload through its schema — Redis carries JSON across the process
boundary, so nothing arrives typed.

## Scripts

- `pnpm --filter zalo-worker dev` — start in watch mode
- `pnpm --filter zalo-worker build` — compile to `dist/`
- `pnpm --filter zalo-worker lint` / `typecheck` / `test` — quality gates

Environment variables are validated at bootstrap by the Zod schema in
[src/config/env.ts](src/config/env.ts); the process refuses to start on an
invalid or missing value. A local Redis is expected at `REDIS_URL`
(`redis://localhost:6379` by default).
