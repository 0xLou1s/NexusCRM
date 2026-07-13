# NexusCRM — System Design

Date: 2026-07-12

## 1. Context and goals

NexusCRM is a rewrite of ZaloCRM: a system for managing multiple personal Zalo accounts from a single web UI — realtime chat, pipeline-based contact management, appointments, dashboard, reports, role-based access, a public API and webhooks.

Quality goals:

- Redeploying the API must **never drop** a live Zalo connection.
- Types are declared **once, on the backend**. The frontend never redeclares them.
- Small increments: each PR touches one layer; each phase delivers one working feature group.

## 2. Stack

| Component                  | Technology                           |
| -------------------------- | ------------------------------------ |
| API                        | NestJS, REST + Socket.IO, Swagger    |
| Zalo worker                | NestJS standalone (no HTTP), zca-js  |
| ORM / migrations           | Drizzle + drizzle-kit                |
| Database                   | Supabase Postgres                    |
| Object storage             | Supabase Storage (presigned uploads) |
| Queue / pub-sub / counters | Redis (BullMQ + Socket.IO adapter)   |
| Validation → OpenAPI       | Zod + drizzle-zod + nestjs-zod       |
| Frontend types             | openapi-typescript + openapi-fetch   |
| Frontend                   | Next.js, shadcn/ui, TanStack Query   |
| Monorepo                   | pnpm workspace + Turborepo           |

Supabase acts purely as **Postgres + S3**. Supabase Auth, RLS and PostgREST are not used — NestJS owns all authentication and authorization.

## 3. Architecture

### 3.1 Monorepo layout

```text
apps/
  api/           Nest — REST + Socket.IO gateway + cron. Stateless.
  zalo-worker/   Nest standalone — owns the zca-js pool. Stateful, exactly one instance.
  web/           Next.js
packages/
  db/            Drizzle schema + migrations + client factory
  contracts/     Zod: socket events, BullMQ job payloads, shared enums
  api-types/     openapi-typescript output (generated, committed)
  ui/            shadcn
```

NestJS apps and modules are **always scaffolded with the Nest CLI** (`nest new`, `nest g resource|module|service`). Never hand-create the files and folders.

### 3.2 Process boundaries

`api` and `zalo-worker` **never call each other over HTTP**. They communicate only through Redis:

- `api` → `worker`: enqueue BullMQ jobs (`zalo.login-qr`, `zalo.send-message`, `zalo.sync-contacts`, `zalo.disconnect`).
- `worker` → `api`: publish events on Redis pub/sub (`zalo:qr`, `zalo:connected`, `message:received`, …). `api` subscribes and forwards them to browsers over Socket.IO.

The worker writes to the database directly (through `packages/db`): an inbound message is persisted by the worker, and only then published as an event carrying the stored row.

**Redis pub/sub is fire-and-forget** — an event with no subscriber is lost. That is acceptable precisely because the worker **persists first and publishes second**: the database is the source of truth, not the socket. An API restart loses a few seconds of realtime notifications, never a message. When the socket reconnects, the frontend refetches (`refetchOnReconnect`) and catches up. Redis Streams are not needed.

### 3.3 Type chain — a single source of truth

```text
Drizzle table (packages/db)
  → drizzle-zod (createSelectSchema / createInsertSchema)
    → refined in apps/api (omit password_hash, session_encrypted, …)
      → nestjs-zod (ZodDto + patchNestJsSwagger)   ← validates requests AND generates Swagger
        → openapi.json
          → openapi-typescript
            → packages/api-types/schema.d.ts        (committed)
              → apps/web: openapi-fetch + TanStack Query
```

The `pnpm gen:api-types` script boots the Nest app **without listening on a port** (`NestFactory.create` + `SwaggerModule.createDocument` → write file → exit), so it runs in CI without a live server.

**CI must enforce this**: re-run `gen:api-types`, then `git diff --exit-code`. Drifted types fail the build. Without that gate, frontend and backend drift apart within weeks and the whole "declare once on the backend" principle becomes meaningless.

OpenAPI cannot describe socket events or the job payloads exchanged between the two backend processes. Those live in `packages/contracts` as Zod schemas (producing `ServerToClientEvents` / `ClientToServerEvents` for `socket.io-client`). They are still declared once on the backend; the frontend imports the types directly because this is a TypeScript monorepo.

## 4. Data model

Every business table carries `org_id`. Repositories **require `orgId` as a parameter** and a guard attaches `orgId` to the request — forgetting to scope a query becomes a compile error rather than a runtime data leak.

### 4.1 Tenancy and users

- `organizations` — `id`, `name`, timestamps.
- `teams` — `id`, `org_id`, `name`.
- `users` — `id`, `org_id`, `team_id?`, `email` (unique), `password_hash`, `full_name`, `role` (`owner|admin|member`), `is_active`, timestamps.
- `refresh_tokens` — `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at?`, `user_agent`, `ip`. Hashes only, and `revoked_at` makes logout actually revoke.

### 4.2 Zalo

- `zalo_accounts` — `id`, `org_id`, `owner_user_id`, `zalo_uid?` (unique), `display_name`, `avatar_url`, `phone`, `status` (`disconnected|connecting|qr_pending|connected`), **`session_encrypted` (bytea, AES-GCM, key from the `ENCRYPTION_KEY` env var)**, `last_connected_at`.

  The session is a real Zalo login cookie. A database leak means a stolen account, so it is never stored as plaintext JSON.

- `zalo_account_access` — `id`, `zalo_account_id`, `user_id`, `permission` (`view|chat|manage`), unique `(zalo_account_id, user_id)`.

### 4.3 Contacts and chat

- `contacts` — `id`, `org_id`, `zalo_uid?`, `phone`, `email`, `full_name`, `avatar_url`, `source`, `source_date`, `first_contact_date`, `status` (`new|contacted|interested|converted|lost`), `assigned_user_id?`, `notes`, `tags` (jsonb), `metadata` (jsonb), timestamps.

  Unique `(org_id, zalo_uid)` — required, because contact sync is a repeated upsert.

- `conversations` — `id`, `org_id`, `zalo_account_id`, `contact_id?`, `thread_type` (`user|group`), `external_thread_id`, `name?`, `last_message_at`, `unread_count`, `is_replied`, `last_inbound_at`.

  Unique `(zalo_account_id, external_thread_id)`. `last_inbound_at` is stored separately so the "unanswered for more than 30 minutes" rule can be evaluated without scanning `messages`.

- `messages` — `id`, `conversation_id`, `zalo_msg_id?`, `sender_type` (`self|contact`), `sender_uid`, `sender_name`, `content`, `content_type` (`text|image|file|sticker|voice|video|link`), `attachments` (jsonb, referencing `media_objects.id`), `is_deleted`, `deleted_at?`, `sent_at`, `replied_by_user_id?`, `delivery_status` (`pending|sent|failed`).

  Unique `(conversation_id, zalo_msg_id)` — a reconnecting worker can replay messages; without this constraint you get duplicates.

- `media_objects` — `id`, `org_id`, `storage_key`, `mime_type`, `size_bytes`, `original_size_bytes`, `width?`, `height?`, `checksum`.

  A separate table because media is compressed before storage, so the original and compressed sizes both need a home.

### 4.4 Appointments and notifications

- `appointments` — `id`, `org_id`, `contact_id`, `assigned_user_id?`, **`appointment_at` (timestamptz, a single column)**, `type?`, `status` (`scheduled|completed|cancelled|no_show`), `notes?`, `reminder_sent_at?`.

  Double-booking is prevented by a partial unique index on `(org_id, contact_id, date(appointment_at))` where `status = 'scheduled'` — Postgres enforces the rule instead of application code being trusted to.

- `notifications` — `id`, `org_id`, `user_id?` (null means org-wide), `type` (`unreplied_message|upcoming_appointment|zalo_disconnected`), `title`, `body`, `entity_type?`, `entity_id?`, `read_at?`.

### 4.5 Stats, integrations, audit

- `daily_message_stats` — `org_id`, `user_id`, `zalo_account_id`, `stat_date`, `messages_sent`, `messages_received`, `messages_unread`, `messages_unreplied`, `avg_response_seconds`. Unique `(user_id, zalo_account_id, stat_date)`.
- `api_keys` — `id`, `org_id`, `name`, `key_hash`, `key_prefix` (for display), `last_used_at?`, `revoked_at?`.
- `webhook_endpoints` — `id`, `org_id`, `url`, `secret_encrypted`, `events` (jsonb), `is_active`.
- `webhook_deliveries` — `id`, `endpoint_id`, `event`, `payload` (jsonb), `status` (`pending|success|failed`), `response_status?`, `attempts`, `next_retry_at?`.
- `activity_logs` — `id`, `org_id`, `user_id?`, `action`, `entity_type?`, `entity_id?`, `details` (jsonb).

### 4.6 Two deliberate departures from the old system

**The 200-messages-per-day cap is not counted in the database.** It is counted in Redis (`zalo:{id}:sent:{date}`, atomic INCR via a Lua script, 48h TTL). The database only aggregates it afterwards for reporting. `SELECT count(*)` followed by `INSERT` is a textbook race condition — two concurrent sends at message 200 exceed the cap, and the price of exceeding it is a banned Zalo account.

**There is no orders table.** The business documentation describes no order or revenue functionality. If it is needed, it becomes its own phase later rather than being smuggled into this scope.

## 5. Zalo worker and realtime flow

### 5.1 The pool

`ZaloPoolService` holds a `Map<zaloAccountId, ZaloSession>` in memory. On startup it loads accounts that have a stored session, decrypts it, logs back in and attaches listeners — **staggered over time**, never logging in a dozen accounts within one second.

**Single-instance lock:** the worker must hold a Redis lock (`zalo-worker:leader`, self-renewing). If a second instance is ever started, it does not get the pool. Without the lock each account would have two listeners, producing duplicate messages — and two concurrent sessions on one Zalo account look anomalous to Zalo.

**Reconnect:** exponential backoff. A circuit breaker trips after too many disconnects within a time window: the account moves to `status = qr_pending`, an event asks the user to rescan the QR code, and automatic reconnection stops.

### 5.2 Inbound message flow

1. The zca-js listener fires an event.
2. The worker upserts the `contact` (by `org_id` + `zalo_uid`), upserts the `conversation`, and inserts the `message` with `ON CONFLICT (conversation_id, zalo_msg_id) DO NOTHING`.
3. If media is attached: download it, compress with `sharp` (images → WebP, longest edge capped at 1920px), compute a checksum, upload to Supabase Storage, and record a `media_objects` row.
4. Update the `conversation`: `last_message_at`, `unread_count++`, `is_replied = false`, `last_inbound_at`.
5. Publish `message:received` carrying the stored row.

### 5.3 Outbound message flow

1. The frontend calls `POST /conversations/:id/messages`.
2. The API checks the ACL (`chat` or `manage`) and the daily cap through a **Redis Lua script** (INCR and threshold check in one atomic step). Over the cap → `429`, and no row is created.
3. The API inserts the `message` with `delivery_status = 'pending'` and returns **202 with the real row** — so the frontend renders optimistically using the real id, not a temporary one.
4. The API enqueues `zalo.send-message`.
5. The worker sends through zca-js behind a **per-account rate limiter** (1–3 second spacing plus jitter), which is what prevents the "sending too fast" error.
6. On success → `delivery_status = 'sent'` plus `zalo_msg_id` → publish `message:updated`.
7. On failure → BullMQ retries with backoff three times; if it still fails, `delivery_status = 'failed'`, the **quota is refunded**, and `message:failed` is published so the frontend can offer a retry.

### 5.4 Media: a private bucket

The Supabase Storage bucket is **private**. Public URLs are never handed out.

- **Reading:** the frontend requests a signed URL from the API (`GET /media/:id/url`). The API verifies the media belongs to the caller's org and that the caller holds an ACL on the corresponding Zalo account, then signs a short-lived URL (~5 minutes).
- **Writing:** the frontend requests a presigned upload URL (`POST /media/upload-url`), uploads straight to Supabase — bypassing Nest, so large files never occupy an API worker — then passes the `storage_key` when creating the message. The API confirms the object exists before accepting it.

With a public bucket, anyone who can guess a key can read customer media. For a CRM holding real conversations, that is a data breach.

### 5.5 Socket rooms

Rooms are keyed by **`zalo-account:{id}`**, not by org. The reason: a `member` may only see the Zalo accounts they have been granted, so broadcasting per-org and filtering client-side would leak data.

The socket handshake authenticates with the same JWT cookie. The server reads the ACL and **joins the user into the rooms they are entitled to**. Clients cannot choose their own rooms.

## 6. Authentication and authorization

- Access token (~15 minutes) and refresh token (~7 days), both in **httpOnly cookies**, `SameSite=Lax`. Next.js Server Components and middleware can read cookies, so server-side fetching works normally.
- **Refresh token rotation**: each refresh revokes the old token and issues a new one. Reusing a revoked token revokes every token for that user — it means the token was stolen.
- CORS with `credentials` enabled, restricted to the web origin.
- Passwords hashed with Argon2.
- A global `JwtAuthGuard` (opt out with `@Public()`), a `RolesGuard` for `owner|admin|member`, and a `ZaloAccessGuard` for per-account ACLs.

### 6.1 No public sign-up

This is a self-hosted system, not an open SaaS. The registration endpoint **only works while the database has no organization**; it creates the first org together with its `owner` user. After that it locks itself, and every further user is created by an `owner` or `admin` from the staff page.

The data model keeps `org_id` throughout, so opening this up to multiple organizations later means re-enabling the endpoint — not migrating data.

### 6.2 Time zone

Everything is stored as `timestamptz` (UTC). Every **day boundary** is computed in `Asia/Ho_Chi_Minh`:

- The quota key `zalo:{id}:sent:{date}` uses the local calendar date, so the 200-message cap resets at 00:00 local time.
- The appointment reminder job runs at 08:00 local time.
- `daily_message_stats.stat_date` and the report date-range filters also follow local time.

The zone lives in an env var (`APP_TIMEZONE`); it is never hard-coded.

## 7. Errors, testing, security

**Errors.** A global `ZodValidationPipe` (nestjs-zod) plus a single `AllExceptionsFilter` that returns exactly one error shape, `{ code, message, params?, issues? }`. Because that shape is in Swagger — and because every status reuses it — the frontend gets one type for errors rather than a union it has to narrow. Domain errors use dedicated classes (`ZaloQuotaExceededError`, `ZaloNotConnectedError`, …) which the filter maps to HTTP statuses; services never throw `HttpException` directly.

**The API does not choose the language.** `code` is an i18n key from a single catalogue, namespaced by module (`common.*` and `validation.*` are shared; `auth.emailAlreadyTaken`, `zalo.quotaExceeded` belong to theirs). It is the _only_ identifier — a separate machine-readable code alongside a translation key would be the same fact spelled twice, and the two would drift. The frontend renders `t(code, params)`. `message` is English and is never displayed: it exists for logs, and for the public API consumers of Phase 11, who have no dictionary. Because the catalogue reaches `schema.d.ts` as a literal union, a frontend dictionary that is missing a key does not compile.

`issues` is a typed `{ path, code, message, params? }[]` and is what a form renders **under the input that caused it**; `path` is dotted (`profile.phone`). A rejected request answers **422**, not 400 — the JSON parsed, its contents did not pass, and 400 is left to a body that could not be read at all. The failed constraint travels in `params`: `too_small` arrives as `validation.tooSmall` with `{ minimum: 8 }`, so the sentence lives in the dictionary and the number lives in the Zod schema — change the rule and the translation follows rather than lying. A domain rule that is about a field fills `issues` too: "this email is taken" is not a Zod failure, but it belongs under the email input, and the frontend should not need a second code path to put it there.

**Testing.** Vitest for unit tests of pure logic (quota, rate limiter, dedupe, appointment conflict detection). Supertest plus **a real Postgres via Testcontainers** for integration tests — the database is not mocked, because unique constraints and indexes are exactly what needs verifying. `zca-js` is mocked at the `ZaloPoolService` boundary; tests never talk to Zalo.

**Security.** Argon2 for passwords. AES-GCM for Zalo sessions and webhook secrets. API keys stored as hash plus prefix. Helmet, strict CORS, global rate limiting. And the **internal Swagger UI must be disabled or auth-gated in production** — it exposes the entire API surface.

## 8. Phase roadmap

Each bullet is one PR. The repeating shape of a feature: `migration` → `service + endpoints (nest g resource)` → `pnpm gen:api-types` → `frontend data layer`.

### Phase 0 — Foundation (walking skeleton)

- `nest new apps/api`, wire into the pnpm workspace and Turborepo, inherit the shared lint/format/tsconfig packages.
- `packages/db`: Drizzle + drizzle-kit pointed at Supabase; first migration; `db:generate` / `db:migrate` / `db:studio` scripts.
- `packages/contracts`: Zod scaffolding for socket events and job payloads.
- `apps/api`: nestjs-zod + Swagger; `GET /health` reading one row from the database; the `gen:api-types` script producing `packages/api-types/schema.d.ts`.
- `apps/web`: openapi-fetch client + TanStack Query provider; one page calling `/health` using the generated types.
- `nest new apps/zalo-worker` (Nest standalone, no HTTP) + Redis/BullMQ + one no-op job proving `api → worker`.
- `docker-compose` (redis, api, worker, web) + `.env.example`; CI running lint / typecheck / test plus the **type-drift gate**.

Phase 0 ships no business feature, but the type chain runs end to end, from a Drizzle table to a React component. Every later phase just repeats that shape.

### Phase 1 — Auth and tenancy

- Migration: `organizations`, `users`, `refresh_tokens`.
- `nest g resource auth`: bootstrap the first owner (creating the org), login, refresh, logout, `GET /me`.
- Guards plus `@CurrentUser` / `@OrgId` decorators; the repository layer that requires `orgId`.
- Frontend: route-protecting middleware, session provider, automatic refresh on 401, logout.
- `ActivityLogInterceptor` — introduced here, used by every later phase.

### Phase 2 — Staff and teams

- Migration: `teams`, plus `users.team_id`.
- Staff CRUD, role changes, activate/deactivate, password reset (owner/admin).
- Team CRUD, add/remove members.
- Frontend data layer for the staff and teams pages.

### Phase 3 — Zalo accounts and QR login

- Migration: `zalo_accounts`, `zalo_account_access`; the AES-GCM encryption helper.
- `packages/contracts`: Zalo job payloads and socket events.
- Worker: `ZaloPoolService` — QR login, session persistence, an empty listener, the Redis leader lock, staggered restore on boot, reconnect plus circuit breaker.
- API: Zalo account CRUD, enqueueing login-qr/disconnect; the **Socket.IO gateway** (authenticated handshake, ACL-driven room joins); the Redis pub/sub → socket bridge.
- API: endpoints for granting `view|chat|manage`.
- Frontend: typed socket client from `packages/contracts`; realtime QR modal.

This phase comes before chat because `zca-js` is the single largest technical risk — it is an unofficial library. If it breaks, that needs to surface here, not in Phase 6.

### Phase 4 — Contacts and contact sync

- Migration: `contacts`.
- CRUD, filters (pipeline / source / assignee), pagination, sorting.
- Worker: the `zalo.sync-contacts` job — upsert contacts, publish `sync:progress`.
- Frontend data layer for the contacts table and pipeline.

### Phase 5 — Chat: receiving

- Migration: `conversations`, `messages`.
- Worker: the real listener — normalize, dedupe, persist, update the conversation, publish.
- API: conversation list (cursor-paginated, filterable by Zalo account, unread), message history (reverse cursor pagination), mark-as-read.
- Frontend: the three-pane data layer, infinite scroll, realtime append.

### Phase 6 — Chat: sending and media

- Migration: `media_objects`; the Supabase Storage module: private bucket, `POST /media/upload-url` (presigned upload) and `GET /media/:id/url` (ACL-checked signed URL).
- The Redis quota Lua script plus the per-account spacing rate limiter.
- API: `POST /conversations/:id/messages` → 202 with a `pending` row; enqueue the job.
- Worker: the send consumer, retries, `sent`/`failed` transitions, quota refunds; inbound media: download → `sharp` compression → upload.
- Frontend: composer, presigned upload, the three message states, retry button.

Chat is split across two phases because sending drags in quota, rate limiting, retries and media. Cramming that into one phase would violate the small-PR rule.

### Phase 7 — Appointments

- Migration: `appointments` plus the partial unique index against double-booking.
- CRUD, the three views (today / upcoming / all), status transitions.
- A BullMQ repeatable job at 08:00 creating reminder notifications for tomorrow's appointments.
- Frontend data layer, plus quick appointment creation from the chat panel.

### Phase 8 — Notifications

- Migration: `notifications`.
- Rule engine: unanswered for more than 30 minutes (from `last_inbound_at` + `is_replied`), upcoming appointments, Zalo disconnections (from worker events).
- API: list, mark-read, unread-count; publish `notification:created` over the socket.
- Frontend: the realtime notification bell.

### Phase 9 — Dashboard and reports

- Migration: `daily_message_stats` plus the aggregation job.
- API: the six KPIs; the 30-day message chart; the pipeline chart; the contact-source chart.
- API: date-range reports plus **streamed Excel export** (never loading the whole sheet into memory).
- Frontend data layer for the dashboard and reports.

### Phase 10 — Global search

- Postgres `tsvector` + GIN indexes over contacts / messages / appointments, with `unaccent` for Vietnamese.
- `GET /search` merging the three result types.
- Frontend: the command palette data layer.

### Phase 11 — Public API and webhooks

- Migration: `api_keys`, `webhook_endpoints`, `webhook_deliveries`.
- `ApiKeyGuard` plus a **separate Swagger document at `/docs/public`**, isolated from the internal one.
- Public endpoints: `GET/POST /public/contacts`, `POST /public/messages/send`, `GET /public/appointments`.
- Webhook dispatcher: BullMQ, HMAC signatures, retry with backoff, and a test endpoint.
- Frontend: the API & webhooks page.

### Phase 12 — Hardening and operations

- Global rate limiting, helmet, strict CORS.
- Health and readiness probes for both `api` and `zalo-worker`.
- Request-id propagated across api → queue → worker in logs.
- End-to-end tests of the main flows; backups; operations documentation.

## 9. Out of scope

- Orders and revenue.
- The Zalo Official Account API — this system drives personal Zalo accounts through `zca-js`.
- Visual design: the project owner designs and implements the UI. What this spec covers is the backend plus the frontend's **functional layer** (data layer, generated types, state, routing, realtime).
