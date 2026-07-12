# NexusCRM — Implementation Checklists

Spec: [2026-07-12-nexuscrm-zalo-crm-design.md](../specs/2026-07-12-nexuscrm-zalo-crm-design.md)

One file per phase. Each phase is executable in a fresh session: load the spec plus that phase's file, nothing else.

Each `## PR x.y` heading inside a phase is **one PR**. Do not merge two of them into a single PR.

## Ground rules for every PR

- Scaffold Nest apps and modules with the **Nest CLI** (`nest new`, `nest g resource|module|service`). Never hand-create the files.
- After any change to a DTO or endpoint, run `pnpm gen:api-types` and commit the regenerated `packages/api-types/schema.d.ts` in the same PR.
- Tests go in the same PR as the code they cover.
- Everything written into the repo — code, comments, docs, commit messages — is in **English**.
- **Never `git add` or `git commit` automatically.** When a PR's checklist is done, report the changed files and a suggested commit message; the repo owner stages and commits.

## Phases

| Phase | File                                                               | Delivers                                            |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 0     | [phase-00-foundation.md](phase-00-foundation.md)                   | Walking skeleton: 3 apps, type chain end to end, CI |
| 1     | [phase-01-auth-tenancy.md](phase-01-auth-tenancy.md)               | Login, orgs, guards, session on the frontend        |
| 2     | [phase-02-staff-teams.md](phase-02-staff-teams.md)                 | Staff and team management                           |
| 3     | [phase-03-zalo-accounts-qr.md](phase-03-zalo-accounts-qr.md)       | Zalo pool, QR login, Socket.IO, ACLs                |
| 4     | [phase-04-contacts.md](phase-04-contacts.md)                       | Contacts, pipeline, contact sync                    |
| 5     | [phase-05-chat-receiving.md](phase-05-chat-receiving.md)           | Conversations, inbound messages, realtime           |
| 6     | [phase-06-chat-sending-media.md](phase-06-chat-sending-media.md)   | Sending, quota, rate limiting, media                |
| 7     | [phase-07-appointments.md](phase-07-appointments.md)               | Appointments plus the reminder job                  |
| 8     | [phase-08-notifications.md](phase-08-notifications.md)             | Notification rules and the bell                     |
| 9     | [phase-09-dashboard-reports.md](phase-09-dashboard-reports.md)     | KPIs, charts, Excel export                          |
| 10    | [phase-10-global-search.md](phase-10-global-search.md)             | Full-text search across entities                    |
| 11    | [phase-11-public-api-webhooks.md](phase-11-public-api-webhooks.md) | API keys, public endpoints, webhooks                |
| 12    | [phase-12-hardening.md](phase-12-hardening.md)                     | Rate limits, probes, tracing, E2E, ops              |

Phases 0 → 6 are strictly ordered. Phases 7 → 11 depend only on 0 → 6 and can be reordered freely.
