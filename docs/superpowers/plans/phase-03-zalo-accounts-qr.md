# Phase 3 — Zalo accounts and QR login

**Goal:** Scan a QR code from the web UI, and a real Zalo account stays connected in the worker — surviving an API redeploy.

**Depends on:** Phase 1 (Phase 2 is not required).

**This is the riskiest phase.** `zca-js` is unofficial and undocumented. It comes before chat deliberately: if it does not work, that must surface here, while nothing depends on it yet.

**Done when:** Scan the QR, close the browser, redeploy the API, reopen the browser — the account still shows as connected.

---

## PR 3.1 — Schema and encryption

- [ ] `zalo_accounts` and `zalo_account_access` (spec §4.2); `status` and `permission` as Postgres enums
- [ ] `packages/db`: an AES-GCM helper (`encrypt`/`decrypt`) keyed from `ENCRYPTION_KEY`, storing IV alongside ciphertext
- [ ] Tests: round-trip; decryption with a wrong key throws rather than returning garbage
- [ ] The session column is `bytea`. Never `jsonb`. (spec §4.2)
- [ ] Migration

## PR 3.2 — Contracts for Zalo

- [ ] `packages/contracts`: job payloads — `zalo.login-qr`, `zalo.disconnect` (`zalo.send-message` and `zalo.sync-contacts` land in later phases, declare them when they are used)
- [ ] Socket events: `zalo:qr`, `zalo:qr-expired`, `zalo:scanned`, `zalo:connected`, `zalo:disconnected`, `zalo:reconnect-failed`
- [ ] Every payload carries `zaloAccountId`, so the API knows which room to emit into

## PR 3.3 — Worker: the pool

- [ ] `nest g module zalo` + `nest g service zalo-pool` inside `apps/zalo-worker`
- [ ] `zca-js` loaded through `createRequire` — it has no usable ESM type exports
- [ ] **Redis leader lock** (`zalo-worker:leader`, self-renewing). Without the lock, a second worker instance means two listeners per account, duplicate messages, and a session pattern that looks anomalous to Zalo. (spec §5.1)
- [ ] QR login: publish `zalo:qr` / `zalo:qr-expired` / `zalo:scanned` as the SDK reports them; on success, encrypt and persist the session
- [ ] On boot: load accounts that have a session, decrypt, log back in — **staggered**, never a burst
- [ ] Reconnect with exponential backoff; a circuit breaker moves the account to `qr_pending` and stops retrying after too many failures in a window
- [ ] A listener that does nothing yet — Phase 5 fills it in
- [ ] Test with `zca-js` mocked at the service boundary: QR events propagate; boot restore is staggered; the circuit breaker trips; a second instance does not acquire the pool

## PR 3.4 — API: accounts and the socket gateway

- [ ] `nest g resource zalo-accounts` — list, create (a name only; connection happens via QR), delete
- [ ] `POST /zalo-accounts/:id/connect` and `/disconnect` enqueue jobs; they never touch `zca-js` directly
- [ ] `nest g gateway events` — Socket.IO with the Redis adapter
- [ ] Handshake authenticates from the **same JWT cookie** as REST
- [ ] On connect, the server reads the caller's ACL and joins them into `zalo-account:{id}` rooms. **Clients cannot request rooms.** (spec §5.5)
- [ ] A Redis pub/sub subscriber that forwards worker events into the matching room
- [ ] Test: a `member` with no ACL on an account receives none of that account's events
- [ ] Run `pnpm gen:api-types`

## PR 3.5 — ACL endpoints

- [ ] `PUT /zalo-accounts/:id/access` — grant `view|chat|manage` to a user
- [ ] `DELETE /zalo-accounts/:id/access/:userId`
- [ ] `ZaloAccessGuard` + `@RequireZaloAccess('chat')`, used by every later phase that touches an account
- [ ] Changing an ACL must **re-join or evict** that user's live sockets — otherwise a revoked user keeps receiving messages until they refresh
- [ ] Run `pnpm gen:api-types`

## PR 3.6 — Frontend

- [ ] A typed `socket.io-client` wrapper using `ServerToClientEvents` from `@workspace/contracts`
- [ ] Reconnect handling: on socket reconnect, invalidate the affected queries (this is what makes missed pub/sub events harmless — spec §3.2)
- [ ] Zalo accounts data layer: list, create, connect, disconnect, grant access
- [ ] QR flow: request connect → render the QR image arriving over the socket → refresh on expiry → close on connected
- [ ] Verify: scan with a real phone, then restart the API container and confirm the account stays connected

---

## Risks

**`zca-js` is the whole risk.** Wrap every SDK call behind `ZaloPoolService` so the rest of the codebase never imports it. When it breaks — and it will, when Zalo changes something — the blast radius is one file.

**Do not test against a real Zalo account in CI.** Mock at the `ZaloPoolService` boundary. Manual verification with a real phone happens once, locally.

**Session encryption key rotation is out of scope**, but do not paint yourself into a corner: store the key id alongside the ciphertext so rotation is possible later.

## Definition of done

- [ ] QR scan connects a real account and the session persists encrypted
- [ ] Restarting `apps/api` does not drop the connection — the core promise of the architecture
- [ ] Killing the worker and restarting it restores connections from stored sessions
- [ ] A user without an ACL receives no socket events for that account
