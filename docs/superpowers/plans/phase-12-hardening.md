# Phase 12 — Hardening and operations

**Goal:** Run this in production without being afraid of it.

**Depends on:** Everything.

**Done when:** You can answer "is it up, what broke, and can I get the data back" without guessing.

---

## PR 12.1 — Security pass

- [ ] Helmet on the API
- [ ] Global rate limiting (`@nestjs/throttler`), tighter on `/auth/login` than elsewhere — brute force is the realistic attack here
- [ ] **The internal Swagger UI is disabled, or auth-gated, in production** (spec §7)
- [ ] Confirm CORS allows exactly one origin and no wildcard reaches production
- [ ] Confirm no secret is ever logged: Zalo sessions, webhook secrets, API keys, passwords, JWTs
- [ ] Verify: grep the logs of a full manual run for anything that looks like a credential

## PR 12.2 — Health and readiness

- [ ] `apps/api`: `/health` (liveness) and `/ready` (checks Postgres and Redis)
- [ ] `apps/zalo-worker`: a health signal that reports **per-account connection status** — a worker whose process is alive but whose Zalo pool is empty is not healthy, and that distinction is the one that matters here
- [ ] Docker healthchecks wired to both
- [ ] Verify: killing Redis flips `/ready` to unhealthy

## PR 12.3 — Observability

- [ ] Structured JSON logging (`pino`), with the log level from config
- [ ] A **request id** generated at the API edge, carried into the BullMQ job payload, and logged by the worker — otherwise a failed send cannot be traced from click to Zalo
- [ ] Log every Zalo connect, disconnect and circuit-breaker trip at `warn` or above; these are the events you will actually be paged for
- [ ] A queue depth metric — a growing `zalo.send-message` queue means the worker is stuck

## PR 12.4 — End-to-end tests

- [ ] Playwright against a running stack with `zca-js` mocked at the worker boundary
- [ ] Cover the flows that would be catastrophic to break: log in; connect an account (mocked QR); receive a message; reply; book an appointment; export a report
- [ ] Run them in CI on a schedule, not on every PR — they are slow

## PR 12.5 — Backup and operations

- [ ] Confirm Supabase point-in-time recovery is on, and **restore once into a scratch project** to prove it works. An untested backup is not a backup.
- [ ] Document how to recover a Zalo account that has fallen out of the pool
- [ ] Document the `ENCRYPTION_KEY` rotation procedure — losing that key means every stored Zalo session is dead and every account must be rescanned
- [ ] A deployment runbook: migration ordering, and the fact that the worker must be drained before it is replaced
- [ ] Update the root `README.md`: architecture, setup, operations

---

## Risks

**The backup you never restored.** Test the restore path, once, deliberately.

**Losing `ENCRYPTION_KEY`.** It is not recoverable. Back it up somewhere that is not the same place as the database.

**Replacing the worker without draining it** drops every Zalo connection at once and forces a mass reconnect, which is exactly the pattern that looks abusive to Zalo. Document the drain.

## Definition of done

- [ ] No secret appears in any log
- [ ] `/ready` accurately reflects dependency failures; the worker reports per-account health
- [ ] A single request id traces a send from the browser through to the worker
- [ ] A database restore has actually been performed at least once
