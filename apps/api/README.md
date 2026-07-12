# api

NexusCRM backend: REST + Socket.IO gateway, scaffolded with the Nest CLI.

## Scripts

- `pnpm --filter api dev` — start in watch mode (defaults to port 3001)
- `pnpm --filter api build` — compile to `dist/`
- `pnpm --filter api lint` / `typecheck` / `test` — quality gates
- `pnpm --filter api test:e2e` — hits `/health` against the real `DATABASE_URL`

Environment variables are validated at bootstrap by the Zod schema in
[src/config/env.ts](src/config/env.ts); the process refuses to start on an
invalid or missing value.

## Types are declared here, once

A response type is never written twice. It starts as a Drizzle table, becomes a
Zod schema through `drizzle-zod`, and reaches the controller as a `ZodDto`:

```text
Drizzle table -> drizzle-zod -> ZodDto -> Swagger -> /openapi.json -> @workspace/api-types
```

`@ZodResponse({ type: SomeDto })` is what holds the three representations
together — it serializes the response through the schema, documents it in
OpenAPI, and fails the build if the handler stops returning what the schema
says. Timestamps are the one thing that needs stating: JSON has no date type, so
`timestamptz` columns are refined with the codec in
[src/common/timestamp.ts](src/common/timestamp.ts) and travel as ISO strings.

Change a DTO and the frontend's types go stale, so run `pnpm gen:api-types` from
the repository root and commit the result in the same PR.

## Swagger

Served while `NODE_ENV` is not `production` (the UI exposes the entire API
surface, spec §7):

- `/docs` — the UI
- `/openapi.json` — the document `pnpm gen:api-types` reads
