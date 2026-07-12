# Phase 9 — Dashboard and reports

**Goal:** Open the app in the morning and know, in one screen, what needs attention. Export a date range to Excel when someone asks for numbers.

**Depends on:** Phases 5, 6, 7.

**Done when:** The dashboard loads in well under a second on a database with a few hundred thousand messages, and an Excel export of a month streams without inflating memory.

---

## PR 9.1 — Schema and aggregation

- [ ] `daily_message_stats` table (spec §4.5), unique `(user_id, zalo_account_id, stat_date)`
- [ ] `stat_date` is the **local** calendar date (spec §6.2)
- [ ] Incremental updates: the worker bumps the counters as messages are sent and received, rather than a nightly full recount
- [ ] A nightly reconciliation job that recomputes the previous day from `messages` and corrects drift — incremental counters always drift eventually
- [ ] Migration
- [ ] Tests: counters match a recount; the reconciliation job is idempotent

## PR 9.2 — Dashboard endpoints

- [ ] `GET /dashboard/stats` — the six KPIs: messages today, unanswered, unread, appointments today, new contacts this week, total contacts
- [ ] `GET /dashboard/charts/messages` — sent and received per day over 30 days, read from `daily_message_stats`, never from a scan of `messages`
- [ ] `GET /dashboard/charts/pipeline` — contact count by status
- [ ] `GET /dashboard/charts/sources` — contact count by source
- [ ] Every figure is scoped to the org **and** filtered to the Zalo accounts the caller can access — a member's dashboard must not leak totals from accounts they cannot see
- [ ] Tests: a member's KPIs differ from an owner's when their ACLs differ
- [ ] Run `pnpm gen:api-types`

## PR 9.3 — Reports and Excel export

- [ ] `GET /reports` — date range plus a tab: `messages` / `contacts` / `appointments`
- [ ] `GET /reports/export` — an `.xlsx` **stream**, using a streaming writer (`exceljs` streaming workbook or equivalent). Building the whole sheet in memory is how this endpoint kills the API on a large range.
- [ ] Query the database with a cursor and write rows as they arrive; hold neither the full result set nor the full workbook
- [ ] Cap the range (e.g. 1 year) and reject anything longer with a clear error
- [ ] Tests: exporting a large synthetic range does not blow the heap; the file opens in Excel with the right headers

## PR 9.4 — Frontend

- [ ] Dashboard data layer: the six KPIs and three chart datasets
- [ ] Reports: date-range picker, tab switching, download trigger
- [ ] Charts get the data only — the visual work is the owner's
- [ ] Verify: the numbers on the dashboard agree with a manual count in the database

---

## Risks

**Computing the dashboard from `messages` at request time.** It works for a week and then gets slow, right when there is enough data to matter. Read from `daily_message_stats`.

**A non-streaming Excel export** is the classic way to OOM a Node process. Stream it, and prove it with a large export before shipping.

## Definition of done

- [ ] The dashboard reads from aggregates and is fast on a large dataset
- [ ] The numbers reconcile with a manual count
- [ ] A month-long export streams; memory stays flat
- [ ] A member sees figures only for their accessible accounts
