# Phase 7 — Appointments

**Goal:** Book an appointment against a contact, straight from the chat panel, and get reminded the morning before.

**Depends on:** Phase 4 (contacts). Phase 6 is not required, but the "create from chat" entry point assumes Phase 5 exists.

**Done when:** An appointment created today for tomorrow produces a notification at 08:00 local time.

---

## PR 7.1 — Schema: appointments

- [ ] `appointments` table (spec §4.4); `status` as a Postgres enum
- [ ] **One `appointment_at timestamptz` column.** Not a date column plus a time string.
- [ ] Partial unique index on `(org_id, contact_id, date(appointment_at))` where `status = 'scheduled'` — Postgres enforces the no-double-booking rule from the documentation, so application code cannot forget it
- [ ] The date in that index is computed in `APP_TIMEZONE`, not UTC — otherwise an evening appointment lands on the wrong day (spec §6.2)
- [ ] Migration
- [ ] Test: inserting a second scheduled appointment for the same contact on the same local day is rejected by the database

## PR 7.2 — Appointments CRUD

- [ ] `nest g resource appointments`
- [ ] `GET /appointments` with a `view` filter: `today` / `upcoming` (next 7 days) / `all`, all evaluated in local time
- [ ] `POST /appointments` — a unique-violation from the index surfaces as a clear 409, not a 500
- [ ] `PATCH /appointments/:id` — reschedule, edit notes
- [ ] `POST /appointments/:id/complete` / `/cancel` / `/no-show`
- [ ] Cancelling frees the slot, because the unique index only covers `scheduled`
- [ ] Tests: double-booking → 409; cancelling then rebooking the same day succeeds; the `today` view respects `APP_TIMEZONE`
- [ ] Run `pnpm gen:api-types`

## PR 7.3 — The reminder job

- [ ] A BullMQ **repeatable** job at 08:00 `APP_TIMEZONE`
- [ ] It finds tomorrow's `scheduled` appointments where `reminder_sent_at IS NULL`, creates a notification for the assignee, and stamps `reminder_sent_at`
- [ ] The stamp is what makes it idempotent — a worker restart at 08:00 must not double-notify
- [ ] Notifications are the Phase 8 table. If Phase 8 has not landed yet, ship the table here and the rules there; do not invent a second mechanism.
- [ ] Tests: run the job twice, get one notification; an appointment already stamped is skipped

## PR 7.4 — Frontend

- [ ] Appointments data layer: the three views, create, reschedule, status transitions
- [ ] Quick-create from the contact panel inside chat, prefilled with that contact
- [ ] Surface the 409 as "this contact already has an appointment that day", not a raw error
- [ ] Verify: book, double-book (expect a friendly refusal), cancel, rebook

---

## Risks

**Time zones.** `date(appointment_at)` in UTC will misfile a 21:00 Vietnamese appointment as the next day. Compute the index expression and every "today" filter in `APP_TIMEZONE`.

**A repeatable job that runs on multiple workers double-sends.** Only one worker instance exists (the leader lock from Phase 3), but the `reminder_sent_at` stamp is the real guard. Keep it.

## Definition of done

- [ ] Double-booking is refused by the database, not by a hopeful `if`
- [ ] The three views agree with local time
- [ ] The 08:00 job notifies once, even if the worker restarts at 08:00
