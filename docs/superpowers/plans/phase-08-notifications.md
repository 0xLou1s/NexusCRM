# Phase 8 — Notifications

**Goal:** The bell tells you the three things that actually cost money: an unanswered customer, an appointment coming up, a Zalo account that fell off.

**Depends on:** Phase 5 (unanswered messages), Phase 7 (appointments), Phase 3 (disconnections).

**Done when:** Leaving a customer message unanswered for 30 minutes produces a notification without a page reload.

---

## PR 8.1 — Schema: notifications

- [ ] `notifications` table (spec §4.4); `type` as a Postgres enum
- [ ] `user_id` nullable — null means the whole org (a Zalo disconnection concerns everyone with access, not one person)
- [ ] Index `(org_id, user_id, read_at)` for the unread count
- [ ] Migration
- [ ] If Phase 7 already created this table, skip to PR 8.2

## PR 8.2 — The rules

- [ ] **Unanswered > 30 minutes:** a periodic job over conversations where `is_replied = false` and `last_inbound_at < now() - 30 min`, with no open notification already. This is why `last_inbound_at` lives on the conversation — no scan of `messages` (spec §4.3)
- [ ] **Upcoming appointment:** produced by the 08:00 job from Phase 7. Do not build a second scheduler.
- [ ] **Zalo disconnected:** triggered by the worker's `zalo:disconnected` event, not by polling.
- [ ] Every rule is **deduplicated**: one open notification per (type, entity). A customer unanswered for three hours generates one notification, not six.
- [ ] Replying to a conversation resolves its unanswered notification
- [ ] Tests: an unanswered conversation notifies once, not once per tick; replying clears it; a reconnect clears the disconnection notice

## PR 8.3 — API and realtime

- [ ] `nest g resource notifications`
- [ ] `GET /notifications` (paginated), `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`
- [ ] Publish `notification:created` over the socket, into the room of the users it concerns
- [ ] Org-wide notifications only reach users who hold an ACL on the account in question
- [ ] Run `pnpm gen:api-types`

## PR 8.4 — Frontend

- [ ] Bell data layer: unread count, list, mark-read
- [ ] Append on `notification:created` without a refetch; invalidate on socket reconnect
- [ ] Clicking a notification navigates to the conversation, contact, or Zalo account it refers to
- [ ] Verify: leave a message unanswered for 30 minutes (or shorten the threshold via config to test it), see one notification, reply, and watch it resolve

---

## Risks

**Notification spam is how a bell gets ignored.** The deduplication rule is the feature; without it, this phase makes the product worse. Test the "does not re-notify every tick" path before anything else.

**A configurable threshold** (30 minutes in production) makes this testable in seconds instead of half an hour. Put it in config.

## Definition of done

- [ ] All three rules fire, exactly once each per event
- [ ] Replying or reconnecting resolves the matching notification
- [ ] The bell updates live, and recovers after a socket drop
