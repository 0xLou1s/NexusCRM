# Phase 5 — Chat: receiving

**Goal:** A message sent from a phone to a connected Zalo account appears in the web UI within a second, and is still there after a reload.

**Depends on:** Phase 4.

**Done when:** Someone messages the Zalo account; the conversation jumps to the top of the list with an unread badge, and the message body is in the database.

---

## PR 5.1 — Schema: conversations and messages

- [ ] `conversations` and `messages` (spec §4.3); enums for `thread_type`, `sender_type`, `content_type`, `delivery_status`
- [ ] Unique `(zalo_account_id, external_thread_id)` on conversations
- [ ] **Unique `(conversation_id, zalo_msg_id)` on messages** — a reconnecting worker replays; without this you get duplicates
- [ ] Index `(conversation_id, sent_at DESC)` for reverse cursor pagination
- [ ] Index `(org_id, last_message_at DESC)` for the conversation list
- [ ] Migration

## PR 5.2 — Worker: the real listener

- [ ] Fill in the listener left empty in Phase 3
- [ ] Normalize the SDK event into a message shape (text, image, file, sticker, voice, video, link). **Log and skip** unknown content types rather than crashing the listener — an unrecognized message type must not take down the pool.
- [ ] Upsert contact → upsert conversation → insert message with `ON CONFLICT DO NOTHING`
- [ ] Update the conversation: `last_message_at`, `unread_count++`, `is_replied = false`, `last_inbound_at`
- [ ] Media is **not** downloaded in this phase (Phase 6). Store what the SDK gives you and move on.
- [ ] Publish `message:received` and `conversation:updated` with the stored rows
- [ ] Persist **before** publishing — the database is the source of truth, the socket is a courtesy (spec §3.2)
- [ ] Tests: replaying the same message twice inserts one row; an unknown content type is skipped, not fatal; a group message resolves to a group conversation

## PR 5.3 — API: read endpoints

- [ ] `nest g resource conversations`
- [ ] `GET /conversations` — cursor pagination, filter by Zalo account and unread, ordered by `last_message_at DESC`; **only accounts the caller has an ACL on**
- [ ] `GET /conversations/:id/messages` — reverse cursor pagination (newest first, scroll back)
- [ ] `POST /conversations/:id/read` — zero `unread_count`
- [ ] `GET /conversations/:id` — includes the linked contact
- [ ] Every one of these goes through `ZaloAccessGuard`
- [ ] Tests: a member with no ACL sees no conversations from that account; cursor pagination does not skip or repeat rows when new messages arrive mid-scroll
- [ ] Run `pnpm gen:api-types`

## PR 5.4 — Frontend data layer

- [ ] Conversation list: infinite scroll, filter by Zalo account, unread badges
- [ ] Message history: reverse infinite scroll with anchored scroll position (loading older messages must not jump the viewport)
- [ ] Realtime: on `message:received`, append to the open conversation and bump the list order. If the message belongs to a conversation that is not currently cached, invalidate rather than trying to splice it in.
- [ ] Mark as read when a conversation is opened
- [ ] On socket reconnect, invalidate the conversation and message queries — this is how missed pub/sub events are recovered
- [ ] Verify: send from a phone, watch it appear; then kill the API mid-conversation, send two more messages from the phone, bring the API back, and confirm the frontend catches up on reconnect

---

## Risks

**The listener is the single point of failure for the whole product.** One unhandled exception in it kills message ingestion silently. Wrap the handler body in a catch that logs and continues, and never let a malformed payload escape it.

**Reconnect replay.** After a Zalo reconnect the SDK may re-deliver recent messages. The unique constraint is what saves you — verify it under a real reconnect, not just a unit test.

## Definition of done

- [ ] A phone message reaches the UI in under a second
- [ ] Duplicate delivery inserts one row
- [ ] An API restart mid-conversation loses nothing; the UI catches up on reconnect
- [ ] A user without an ACL never sees the conversation
