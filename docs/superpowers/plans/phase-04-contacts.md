# Phase 4 — Contacts and contact sync

**Goal:** Zalo friends land in the CRM as contacts, and each one moves through the pipeline.

**Depends on:** Phase 3.

**Done when:** Pressing "sync" on a connected Zalo account imports the friend list, and syncing a second time changes nothing (no duplicates).

---

## PR 4.1 — Schema: contacts

- [ ] `contacts` table (spec §4.3); `status` as a Postgres enum
- [ ] **Unique `(org_id, zalo_uid)`** — sync is a repeated upsert and this is what makes it idempotent
- [ ] Indexes: `(org_id, status)`, `(org_id, assigned_user_id)`, `(org_id, phone)`
- [ ] Migration

## PR 4.2 — Contacts CRUD

- [ ] `nest g resource contacts`
- [ ] `GET /contacts` — cursor pagination, filter by status / source / assignee, sort, and a `q` free-text filter over name and phone (full-text search proper is Phase 10)
- [ ] `POST /contacts`, `PATCH /contacts/:id`, `GET /contacts/:id`
- [ ] Deleting a contact is a soft concern: it has conversations and appointments hanging off it. Decide explicitly — recommendation: **no delete endpoint in this phase.** Nobody has asked for it.
- [ ] Pipeline transitions are unconstrained (any status → any status); the documentation describes no state machine, so do not invent one
- [ ] Tests: filters compose; pagination is stable when rows are inserted mid-scroll; a contact from another org is invisible
- [ ] Run `pnpm gen:api-types`

## PR 4.3 — Contact sync job

- [ ] `packages/contracts`: the `zalo.sync-contacts` payload, plus a `sync:progress` socket event
- [ ] Worker: fetch the friend list through `ZaloPoolService`, upsert into `contacts` keyed on `(org_id, zalo_uid)`
- [ ] Sync **only fills empty fields**. It must never overwrite a `full_name`, `phone` or `notes` that a human has edited — that is the sort of bug that quietly destroys a CRM.
- [ ] Emit `sync:progress` (processed / total) so the frontend can show progress on a long import
- [ ] API: `POST /zalo-accounts/:id/sync-contacts` enqueues it, requires the `manage` ACL
- [ ] Tests: syncing twice produces no duplicates; a human-edited name survives a resync

## PR 4.4 — Frontend data layer

- [ ] Contacts list: filters, pagination, sorting
- [ ] Contact detail: edit, assign, change pipeline status, tags
- [ ] Sync button plus live progress from `sync:progress`
- [ ] Verify: sync ~100 real friends, edit one name, sync again, and confirm the edit survived

---

## Risks

**Sync overwriting human edits** is the failure mode that matters here. A resync must never clobber curated data. Test it before shipping.

**Large friend lists.** Upsert in batches and yield between them; do not hold one transaction open across the whole import.

## Definition of done

- [ ] Sync imports friends; a second sync is a no-op
- [ ] Human-edited fields survive a resync
- [ ] Filters and pagination work, scoped to the org
