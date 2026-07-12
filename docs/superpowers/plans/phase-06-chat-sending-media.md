# Phase 6 — Chat: sending and media

**Goal:** Reply from the web UI, attach images and files, and never get the Zalo account banned.

**Depends on:** Phase 5.

**This phase carries the money risk.** Sending too fast, or past the daily cap, gets a real Zalo account locked. The limiter is not a nice-to-have.

**Done when:** A reply from the web arrives on the phone; message 201 in a day is refused with a clear error; a failed send can be retried.

---

## PR 6.1 — Media storage

- [ ] `media_objects` table (spec §4.3)
- [ ] A Supabase Storage module: **private bucket**, never public URLs (spec §5.4)
- [ ] `POST /media/upload-url` — a presigned upload URL; the browser uploads straight to Supabase, bypassing Nest, so a large file never occupies an API worker
- [ ] `GET /media/:id/url` — a short-lived (~5 min) signed URL, only after checking the caller's org **and** their ACL on the owning Zalo account
- [ ] The API confirms the object actually exists in the bucket before accepting a `storage_key` on a message
- [ ] Tests: a media object from another org 403s; a signed URL expires

## PR 6.2 — Quota and rate limiting

- [ ] A Redis **Lua script**: increment `zalo:{id}:sent:{date}` and compare against 200 in one atomic step, TTL 48h. A read-then-write in application code is a race, and losing that race costs an account. (spec §4.6)
- [ ] The date is the **local calendar date** from `APP_TIMEZONE`, so the cap resets at local midnight (spec §6.2)
- [ ] A refund path for when a send ultimately fails
- [ ] A per-account send limiter in the worker: 1–3 second spacing with jitter (spec §5.3)
- [ ] `ZaloQuotaExceededError` → 429 through the exception filter
- [ ] Tests: 200 concurrent sends admit exactly 200, never 201; a refund restores exactly one slot; the counter rolls over at local midnight, not UTC

## PR 6.3 — API: send endpoint

- [ ] `POST /conversations/:id/messages` — requires the `chat` or `manage` ACL
- [ ] Order of operations: check ACL → consume quota → insert the message as `pending` → enqueue → **return 202 with the real row**
- [ ] The frontend renders optimistically using the **real id**, so there is no temporary-id reconciliation to get wrong (spec §5.3)
- [ ] Over quota → 429 and **no row is created**
- [ ] `POST /messages/:id/retry` — re-enqueue a `failed` message (it re-consumes quota)
- [ ] Run `pnpm gen:api-types`

## PR 6.4 — Worker: send consumer and inbound media

- [ ] Consume `zalo.send-message`: send through `ZaloPoolService` behind the rate limiter
- [ ] Success → `delivery_status = 'sent'` + `zalo_msg_id` → publish `message:updated`
- [ ] Failure → BullMQ retry with backoff, 3 attempts → then `failed`, **refund the quota**, publish `message:failed`
- [ ] The account is disconnected → fail fast, do not burn retries against a dead session
- [ ] Inbound media (deferred from Phase 5): download → compress with `sharp` (images → WebP, longest edge 1920px) → checksum → upload → write `media_objects` → link it into the message
- [ ] Compression failure must not lose the message: store the original and log it
- [ ] Tests: a send failure refunds quota exactly once (not once per retry attempt); rate limiting spaces sends out; compression records both original and compressed sizes

## PR 6.5 — Frontend

- [ ] Composer: send on Enter, newline on Shift+Enter
- [ ] Attachments: request a presigned URL, upload directly to Supabase, pass the `storage_key`
- [ ] Render the three message states: `pending` / `sent` / `failed`, with retry on `failed`
- [ ] Show the remaining daily quota, and surface a 429 as a clear message rather than a generic error
- [ ] Media rendering fetches a signed URL on demand and caches it until it expires
- [ ] Verify: send text and an image to a real phone; force a failure by disconnecting the account and confirm the message goes to `failed` with a working retry

---

## Risks

**Refunding on every retry attempt instead of once at final failure** silently inflates the cap. Test it.

**The quota must be checked before the row is inserted, not after.** Otherwise a rejected send still leaves a `pending` row behind.

**Do not let anyone bulk-send.** The documentation is explicit that spam and messaging strangers gets accounts banned. Nothing in this phase should make mass-sending easy.

## Definition of done

- [ ] Replies reach a real phone, text and image
- [ ] The 201st message in a day is refused with 429; the counter resets at local midnight
- [ ] A failed send is retryable and does not leak quota
- [ ] Media lives in a private bucket and is unreachable without a signed URL
