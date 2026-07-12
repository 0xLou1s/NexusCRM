# Phase 10 — Global search

**Goal:** One search box finds a customer, a message, or an appointment — and finds "nguyen" when the record says "Nguyễn".

**Depends on:** Phases 4, 5, 7.

**Done when:** Searching an unaccented query returns accented Vietnamese results, fast, on a large message table.

---

## PR 10.1 — Postgres full-text setup

- [ ] Enable the `unaccent` extension on Supabase
- [ ] A custom text search configuration combining `unaccent` with `simple` — Postgres ships no Vietnamese stemmer, and `simple` plus `unaccent` is the right trade-off here. Do not use `english`: it will stem Vietnamese words into nonsense.
- [ ] Generated `tsvector` columns:
  - `contacts` — over `full_name`, `phone`, `email`, `notes`
  - `messages` — over `content`
  - `appointments` — over `notes`
- [ ] GIN indexes on each
- [ ] Migration
- [ ] Test: "nguyen van a" matches "Nguyễn Văn A"

## PR 10.2 — The search endpoint

- [ ] `GET /search?q=` returning grouped results: contacts, messages, appointments
- [ ] Message results are restricted to the Zalo accounts the caller has an ACL on — search is a classic place to leak data past an ACL
- [ ] A per-group limit (e.g. 5 each) with a "see all" link into the relevant list page; no unbounded result sets
- [ ] Rank by `ts_rank`, and bias recent items — a message from yesterday matters more than one from last year
- [ ] Degrade gracefully on a very short query (under 2 characters → empty, not a full table scan)
- [ ] Tests: an ACL-less member finds none of that account's messages; results are ranked; a 1-character query does not scan the table
- [ ] Run `pnpm gen:api-types`

## PR 10.3 — Frontend

- [ ] Command palette data layer: debounced query, grouped results, keyboard navigation state
- [ ] Selecting a result routes to the conversation, contact, or appointment
- [ ] Verify: search on a database with a few hundred thousand messages and confirm it stays fast

---

## Risks

**The ACL leak.** Global search is the easiest endpoint in the system to accidentally make org-wide instead of ACL-scoped. Write that test first.

**`tsvector` maintenance cost on `messages`.** Every inbound message updates the index. Watch insert throughput after this lands; if it becomes a problem, the fallback is to index only messages newer than N months.

## Definition of done

- [ ] Unaccented queries match accented Vietnamese
- [ ] Search respects per-account ACLs
- [ ] It stays fast on a large message table
