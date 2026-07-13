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

- [ ] `nest g resource auth`
- [ ] `POST /auth/register` — **only works when zero organizations exist**; creates the org plus its `owner` user, and locks itself afterwards (spec §6.1)
- [ ] `POST /auth/login` — Argon2 verify, issue access + refresh tokens as httpOnly cookies (`SameSite=Lax`)
- [ ] `POST /auth/refresh` — **rotation**: revoke the presented token, issue a new pair. A token that is already revoked → revoke every token for that user and return 401 (spec §6)
- [ ] `POST /auth/logout` — revoke the refresh token, clear the cookies
- [ ] `GET /auth/me` — the current user plus their org
- [ ] Tests: bootstrap works once and only once; refresh rotates; a replayed refresh token nukes the whole session; a wrong password never reveals whether the email exists
- [ ] Run `pnpm gen:api-types`

## PR 1.3 — Guards and org scoping

- [ ] Global `JwtAuthGuard`, opt out with `@Public()` (register/login/refresh/health are public)
- [ ] `RolesGuard` + `@Roles('owner', 'admin')`
- [ ] `@CurrentUser()` and `@OrgId()` param decorators
- [ ] The repository base: **every method takes `orgId` as its first argument.** Do not read it from an ambient request context — the point is that omitting it fails to compile (spec §4)
- [ ] Enable CORS with `credentials: true`, restricted to `WEB_ORIGIN`
- [ ] Tests: a request without a cookie → 401; a `member` hitting an `@Roles('admin')` route → 403; a repository call cannot be written without `orgId`
- [ ] Run `pnpm gen:api-types`

## PR 1.4 — Frontend session layer

- [ ] `middleware.ts` — redirect unauthenticated users to `/login`; redirect authenticated users away from `/login`
- [ ] A session provider fed by `GET /auth/me`
- [ ] Login form logic (validation and submission only — visual design is the owner's)
- [ ] An `openapi-fetch` middleware that, on 401, calls `/auth/refresh` once and retries the original request; if the refresh fails, it clears the session and redirects to login
- [ ] Guard against a refresh stampede: concurrent 401s must share a single in-flight refresh, not fire one each
- [ ] Logout
- [ ] Verify: log in, hard-reload, still logged in. Wait for the access token to expire, act, and observe a silent refresh with no visible flicker.

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
