# Phase 1 — Auth and tenancy

**Goal:** A user can log in, stays logged in, and every query from that point on is scoped to their organization.

**Depends on:** Phase 0.

**Done when:** The first owner bootstraps an org, logs in, reloads the page and is still logged in; an unauthenticated request to any endpoint returns 401.

---

## PR 1.1 — Schema: organizations, users, refresh tokens

- [x] `packages/db`: `organizations`, `users`, `refresh_tokens` tables per spec §4.1
- [x] `role` as a Postgres enum (`owner|admin|member`), not a free-text column
- [x] Unique index on `users.email` — across the whole system, not per organization: login is email + password with no tenant selector
- [x] Index on `refresh_tokens.token_hash`, plus one on `user_id` (reuse detection revokes every token a user holds in one statement)
- [x] Generate and apply the migration
- [x] Verify: the tables, indexes and the `user_role` enum are present in Supabase; the migration also replays cleanly into the Testcontainers Postgres, which `pnpm --filter api test` proves
- [x] Tests: the email unique index, the role enum and the `organizations → users → refresh_tokens` cascade are exercised against a real Postgres

## PR 1.2 — Auth module

- [x] `nest g resource auth`
- [x] `POST /auth/register` — **only works when zero organizations exist**; creates the org plus its `owner` user, and locks itself afterwards (spec §6.1). A transaction-scoped advisory lock serializes concurrent bootstraps, which both read an empty table otherwise
- [x] `POST /auth/login` — Argon2 verify, issue access + refresh tokens as httpOnly cookies (`SameSite=Lax`)
- [x] `POST /auth/refresh` — **rotation**: revoke the presented token, issue a new pair. A token that is already revoked → revoke every token for that user and return 401 (spec §6). The revocation _is_ the lookup — one UPDATE matching only a live token — so two requests racing with the same token cannot both rotate it
- [x] `POST /auth/logout` — revoke the refresh token, clear the cookies
- [x] `GET /auth/me` — the current user plus their org, behind a local `JwtAuthGuard` that PR 1.3 promotes to global
- [x] The refresh token is opaque and stored as a SHA-256 hash, not a JWT: it is checked against `refresh_tokens` on every use, which is what lets rotation revoke it
- [x] Error keys are split per module — `<module>/<module>.error-keys.ts`, composed into the one catalogue in `common/errors/error-keys.ts`
- [x] Tests: bootstrap works once and only once (including under a race); refresh rotates; a replayed refresh token nukes the whole session; a wrong password and an unknown email answer byte for byte the same
- [x] Run `pnpm gen:api-types`

## PR 1.3 — Guards and org scoping

- [x] Global `JwtAuthGuard`, opt out with `@Public()` (register/login/refresh/logout/health are public). `@Public()` also writes an `x-public` extension onto the OpenAPI operation, which `openapi.ts` reads back to attach a 401 to everything the guard protects — so a new endpoint documents its 401 without remembering to
- [x] `RolesGuard` + `@Roles('owner', 'admin')`. The decorator carries its own `@ApiResponse(403)`, so a route cannot restrict itself and forget to say so
- [x] `@CurrentUser()` and `@OrgId()` param decorators
- [x] The repository base: **every method takes `orgId` as its first argument.** Do not read it from an ambient request context — the point is that omitting it fails to compile (spec §4)
- [x] Enable CORS with `credentials: true`, restricted to `WEB_ORIGIN` — already in `main.ts` since PR 0.5, verified rather than re-added
- [x] Tests: a request without a cookie → 401; a `member` hitting an `@Roles('admin')` route → 403; a repository call cannot be written without `orgId` (a `@ts-expect-error` that `pnpm typecheck` fails on if it ever compiles)
- [x] Run `pnpm gen:api-types` — no diff: the only guarded endpoint that existed, `GET /auth/me`, already declared its 401

## PR 1.4 — Frontend session layer

- [x] ~~`middleware.ts`~~ **`proxy.ts`** — Next 16 renamed it. Redirects an anonymous visitor to `/login?next=…`, and sends a signed-in one back to `next` (or `/`) when they land on `/login`. It gates on the **refresh** cookie, not the access cookie, which expires after 15 minutes while the session is still alive. It checks presence, never a signature: the JWT secret belongs to the API
- [x] `?next=` is resolved in `proxy.ts` alone, so the open-redirect guard (`safeNextPath`) has one home and the login form never reads a query parameter
- [x] A session provider fed by `GET /auth/me`, backed by a **zustand** store rather than context — the fetch middleware runs outside React and has to be able to drop the session
- [x] Login form: react-hook-form + `@workspace/ui` `Input` / `StatefulButton`. Rules stay on the backend; `handleApiError` puts each 422 issue on the input its `path` names and toasts anything that names no field
- [x] The frontend error dictionary promised by PR 0.9 — one file per module (`lib/i18n/messages/{common,auth,health}.ts`), composed into a `Record<ErrorKey, string>`, so a key added on the backend does not compile until it is translated
- [x] An `openapi-fetch` middleware that, on 401, calls `/auth/refresh` once and retries the original request; if the refresh fails, it clears the session and redirects to login
- [x] Guard against a refresh stampede: concurrent 401s share one in-flight refresh. Not merely an efficiency matter — rotation revokes the token it is handed, so a second concurrent refresh replays a spent one and the API revokes every session the user holds
- [x] Logout
- [x] Verify: every branch of `proxy.ts` exercised against a running Next 16 server, including both open-redirect payloads. The refresh, the replay of the request the 401 came from, and the stampede guard are covered by `apps/web/test`

## PR 1.5 — Activity log interceptor

- [ ] `activity_logs` table (spec §4.5)
- [ ] A global interceptor recording mutating requests (POST/PATCH/DELETE): actor, action, entity, org
- [ ] It must **never** log request bodies wholesale — passwords and Zalo session blobs pass through here
- [ ] Test: a login attempt does not write the password into `activity_logs`

---

## Risks

**Cookies across origins.** In development, web is on `:3000` and api on `:3001`; `SameSite=Lax` plus `credentials: 'include'` plus an exact-origin CORS allowlist is required. If you find yourself reaching for `SameSite=None`, stop — in production both must sit behind one domain.

**The bootstrap endpoint is a permanent hole if it forgets to lock.** Test the "second call fails" path explicitly, not just the happy path.

## Definition of done

- [ ] The first owner registers; a second registration attempt is rejected
- [ ] Login persists across reloads; logout actually revokes server-side
- [ ] Every non-`@Public()` endpoint 401s without a cookie
- [ ] A replayed refresh token invalidates the whole session
