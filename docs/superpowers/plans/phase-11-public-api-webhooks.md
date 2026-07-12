# Phase 11 — Public API and webhooks

**Goal:** An outside system can read contacts, create contacts, send a message, and be told when something happens.

**Depends on:** Phases 4, 5, 6, 7.

**Done when:** A `curl` with an API key creates a contact, and a webhook endpoint receives a signed `contact.created` within seconds.

---

## PR 11.1 — Schema: keys, endpoints, deliveries

- [ ] `api_keys` — store `key_hash` plus a short `key_prefix` for display. **The plaintext key is shown exactly once, at creation.** (spec §4.5)
- [ ] `webhook_endpoints` — `secret_encrypted` (AES-GCM, the same helper as Zalo sessions)
- [ ] `webhook_deliveries` — `attempts`, `next_retry_at`, `status`
- [ ] Migration

## PR 11.2 — API key auth and a separate Swagger document

- [ ] `ApiKeyGuard` reading `X-API-Key`, comparing against the hash, updating `last_used_at`
- [ ] A **second Swagger document** mounted at `/docs/public`, containing only the public routes. The internal document must not be reachable from the public surface (spec §7)
- [ ] Public routes get their own rate limit, tighter than the internal one
- [ ] `POST /api-keys`, `GET /api-keys`, `DELETE /api-keys/:id` (internal, owner/admin only)
- [ ] Tests: a revoked key 401s; a key from another org cannot read this org's data; `/docs/public` does not expose internal routes
- [ ] Run `pnpm gen:api-types`

## PR 11.3 — Public endpoints

- [ ] `GET /public/contacts` — paginated
- [ ] `POST /public/contacts`
- [ ] `POST /public/messages/send` — goes through the **same quota and rate limiter** as the internal send path. An API key must not be a way around the 200/day cap; that would get the account banned just as effectively.
- [ ] `GET /public/appointments`
- [ ] Tests: sending over the public API consumes the same Redis counter as the internal one

## PR 11.4 — Webhook dispatcher

- [ ] Events: `message.received`, `message.sent`, `contact.created`, `zalo.connected`, `zalo.disconnected`
- [ ] Delivery through BullMQ, never inline in the request that triggered it — a slow customer endpoint must not slow down message ingestion
- [ ] **HMAC-SHA256 signature** over the raw body, in an `X-Signature` header, with a timestamp to prevent replay
- [ ] Retry with exponential backoff (e.g. 5 attempts over a few hours); record every attempt in `webhook_deliveries`
- [ ] Auto-disable an endpoint after sustained failure, and notify the org
- [ ] `POST /webhook-endpoints/:id/test` — fire a sample event
- [ ] **Block private address ranges** in webhook URLs (localhost, 10/8, 192.168/16, 169.254/16). Without this, your webhook feature is an SSRF tool aimed at your own infrastructure.
- [ ] Tests: the signature verifies; a failing endpoint retries then disables; a URL pointing at `169.254.169.254` is rejected

## PR 11.5 — Frontend

- [ ] API keys data layer: create (surface the plaintext once, with a copy affordance), list, revoke
- [ ] Webhook endpoints: create, edit, test, view recent deliveries
- [ ] Verify: end-to-end with a real receiver (`webhook.site` or similar)

---

## Risks

**SSRF through webhook URLs** is the sharpest edge in this phase. A CRM that will POST to any URL you give it, from inside your network, is a gift to an attacker. Validate the resolved IP, not just the string.

**A public send path that bypasses the quota** defeats the entire anti-ban design from Phase 6. Route it through the same code.

## Definition of done

- [ ] An API key authenticates; a revoked one does not
- [ ] The public send path consumes the same daily quota
- [ ] Webhooks arrive signed, retry on failure, and disable after sustained failure
- [ ] Private-range URLs are refused
