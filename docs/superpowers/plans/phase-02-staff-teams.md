# Phase 2 — Staff and teams

**Goal:** An owner or admin can create staff accounts, assign roles, and group people into teams.

**Depends on:** Phase 1.

**Done when:** An owner creates a member, that member logs in, and sees only what their role allows.

---

## PR 2.1 — Schema: teams

- [x] `teams` table (spec §4.1); add `users.team_id` as a nullable FK
- [x] Migration
- [x] Verify: deleting a team leaves its users intact with `team_id = null` (do not cascade — deleting a team must not delete people)

## PR 2.2 — Staff management

- [x] `nest g resource users`
- [x] `GET /users` — list within the org, filter by role, team, active flag
- [x] `POST /users` — create staff (owner/admin only); the creator sets the initial password
- [x] `PATCH /users/:id` — name, role, team, active flag
- [x] Assigning a team validates it belongs to the caller's org, tested — the FK alone does not stop a cross-org `team_id`
- [x] `POST /users/:id/reset-password` — owner/admin only
- [x] `DELETE /users/:id` — soft delete via `is_active = false`. Hard delete would orphan messages and appointments.
- [x] Role rules, tested: only an `owner` may create or demote another `owner`; an `admin` may manage `member`s only; **nobody can demote or deactivate themselves** (that is how you lock yourself out of your own system)
- [x] Deactivating a user revokes all of their refresh tokens immediately
- [x] Run `pnpm gen:api-types`

## PR 2.3 — Teams

- [ ] `nest g resource teams`
- [ ] CRUD, plus add/remove members
- [ ] `GET /teams` includes a member count
- [ ] Run `pnpm gen:api-types`

## PR 2.4 — Frontend data layer

- [ ] Query hooks for staff and teams, with TanStack Query invalidation on every mutation
- [ ] Form validation reusing the Zod schemas exported from the backend — do not rewrite the rules in the frontend
- [ ] Verify: create a member in one tab, and the staff list in a second tab reflects it after invalidation

---

## Risks

**Self-lockout.** The most likely bug in this phase is an owner demoting themselves and losing access with no way back. Enforce it server-side and test it.

## Definition of done

- [ ] An owner creates staff with each role; each can log in
- [ ] An admin cannot touch another admin or the owner
- [ ] Deactivating a user kicks their active session on the next request
- [ ] Nobody can demote or deactivate themselves
