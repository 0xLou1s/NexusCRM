# Phase 0 — Foundation (walking skeleton)

**Goal:** Three apps run, and a type declared on a Drizzle table reaches a React component without being retyped anywhere. No business feature ships.

**Why first:** Every later phase repeats this shape. If the type chain or the api/worker boundary is improvised later, it gets improvised inconsistently.

**Done when:** `docker compose up` brings up web, api, worker and redis; the web page renders a value fetched from `/health` using a generated type; CI fails if generated types drift.

---

## PR 0.1 — Scaffold `apps/api`

- [x] `pnpm dlx @nestjs/cli new api --directory apps/api --package-manager pnpm --skip-git`
- [x] Strip the generated `.gitignore`, `.prettierrc`, `.eslintrc` — inherit from the workspace instead
- [x] Point `tsconfig.json` at `@workspace/typescript-config`
- [x] Point `eslint.config.js` at `@workspace/eslint-config`, `prettier.config.mjs` at `@workspace/prettier-config`
- [x] Add `dev` / `build` / `lint` / `typecheck` / `test` scripts matching the other workspace packages
- [x] Register the tasks in `turbo.json`
- [x] Add `@nestjs/config` with a Zod-validated env schema (fail fast on a missing var, do not start with a bad config)
- [x] Verify: `pnpm --filter api dev` starts and `GET /` responds

## PR 0.2 — `packages/db`

- [ ] Create the package: `drizzle-orm`, `drizzle-kit`, `postgres` (postgres.js driver)
- [ ] `drizzle.config.ts` reading `DATABASE_URL` (Supabase connection string, pooled port for the app)
- [ ] `src/client.ts` — a client factory, not a module-level singleton, so api and worker each own their pool
- [ ] `src/schema/index.ts` — barrel file, empty for now
- [ ] Scripts: `db:generate`, `db:migrate`, `db:studio`
- [ ] A trivial first table to prove migrations run end to end (e.g. `app_meta` with a `version` row) — this is also what `/health` reads
- [ ] Verify: `pnpm --filter @workspace/db db:migrate` applies against Supabase

## PR 0.3 — `packages/contracts`

- [ ] Create the package with `zod` as its only runtime dependency
- [ ] `src/events.ts` — the `ServerToClientEvents` / `ClientToServerEvents` interfaces, empty for now
- [ ] `src/jobs.ts` — BullMQ queue names and payload schemas, empty for now
- [ ] `src/index.ts` — barrel export
- [ ] Verify: `apps/web` and `apps/api` can both import from `@workspace/contracts`

## PR 0.4 — Swagger and the type generator

- [ ] Add `nestjs-zod`, `@nestjs/swagger`, `drizzle-zod` to `apps/api`
- [ ] Call `patchNestJsSwagger()` at bootstrap so Zod schemas render into OpenAPI
- [ ] Register `ZodValidationPipe` globally
- [ ] `nest g module health` + `nest g controller health` — `GET /health` reads the `app_meta` row and returns it through a `ZodDto` derived from the Drizzle table via `drizzle-zod`
- [ ] `scripts/generate-openapi.ts` — `NestFactory.create` **without** `listen()`, `SwaggerModule.createDocument`, write `openapi.json`, exit
- [ ] Root script `gen:api-types` — run the generator, then `openapi-typescript openapi.json -o packages/api-types/schema.d.ts`
- [ ] Create `packages/api-types` exporting the generated `schema.d.ts`
- [ ] Verify: `/health` appears in Swagger UI **and** its response type shows up in `schema.d.ts`

## PR 0.5 — Wire the frontend to the generated types

- [ ] Add `openapi-fetch` and `@tanstack/react-query` to `apps/web`
- [ ] `lib/api-client.ts` — an `openapi-fetch` client typed with `paths` from `@workspace/api-types`, `credentials: 'include'` (Phase 1 needs it)
- [ ] `app/providers.tsx` — the TanStack Query provider, with `refetchOnReconnect` on (the spec depends on this to recover from missed socket events)
- [ ] One page calling `/health` and rendering the value
- [ ] Verify: changing the Drizzle column type breaks `pnpm typecheck` on the **web** app. If it does not, the chain is not actually connected — stop and fix it before moving on.

## PR 0.6 — Scaffold `apps/zalo-worker`

- [ ] `pnpm dlx @nestjs/cli new zalo-worker --directory apps/zalo-worker --package-manager pnpm --skip-git`
- [ ] Convert it to a standalone app: `NestFactory.createApplicationContext`, no HTTP listener
- [ ] Same shared config/lint/tsconfig treatment as `apps/api`
- [ ] Add `@nestjs/bullmq` + `bullmq` + `ioredis` to both api and worker
- [ ] Declare one queue and one no-op job in `packages/contracts`
- [ ] api enqueues it on boot; worker consumes it and logs
- [ ] Verify: the log line appears in the worker, proving api → worker works without HTTP

## PR 0.7 — Compose and CI

- [ ] `docker-compose.yml`: `redis`, `api`, `zalo-worker`, `web`. **No postgres service** — Supabase hosts it.
- [ ] `.env.example` with every var: `DATABASE_URL`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY`, `APP_TIMEZONE`, `WEB_ORIGIN`
- [ ] Dockerfiles for api, worker, web (multi-stage, pnpm workspace aware)
- [ ] CI: `turbo lint typecheck test build`
- [ ] CI: **the type-drift gate** — run `pnpm gen:api-types`, then `git diff --exit-code packages/api-types`. Drift fails the build.
- [ ] Verify: deliberately edit `schema.d.ts` by hand and confirm CI goes red

## PR 0.8 — Error contract and test harness

Both of these belong here, not in Phase 1. If they arrive later, every endpoint written before them invents its own error shape and its own test setup, and you spend Phase 2 unifying them.

- [ ] `AllExceptionsFilter` returning exactly one error shape: `{ code, message, details? }` (spec §7)
- [ ] A `DomainError` base class; the filter maps subclasses to HTTP statuses. **Services never throw `HttpException` directly** — that couples business logic to the transport
- [ ] Register the error shape as a Swagger response schema so `schema.d.ts` gives the frontend a type for errors too
- [ ] Vitest configured across the workspace
- [ ] A Testcontainers harness spinning up a **real Postgres** for integration tests, with migrations applied and truncation between tests (spec §7). The database is not mocked: unique constraints and partial indexes are precisely what needs testing, and a mock cannot fail them.
- [ ] One integration test proving the harness works (hit `/health` against the containerized database)
- [ ] Verify: `pnpm test` runs unit and integration suites; CI runs both

---

## Risks

**The type-drift gate is the load-bearing part of this phase.** Without it, nothing enforces "declare once on the backend" and the whole approach quietly rots. Do not defer it to Phase 12.

**`gen:api-types` must not require a database.** If `NestFactory.create` triggers a connection at boot, CI will need Supabase credentials to generate types. Keep the DB connection lazy (postgres.js is lazy by default — do not add an eager ping).

## Definition of done

- [ ] `docker compose up` → all four services healthy
- [ ] The web page shows a value that originated in Postgres
- [ ] Renaming a Drizzle column and running `pnpm typecheck` breaks the **web** build
- [ ] CI is green, and goes red when `schema.d.ts` is edited by hand
