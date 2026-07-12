# api

NexusCRM backend: REST + Socket.IO gateway, scaffolded with the Nest CLI.

## Scripts

- `pnpm --filter api dev` — start in watch mode (defaults to port 3001)
- `pnpm --filter api build` — compile to `dist/`
- `pnpm --filter api lint` / `typecheck` / `test` — quality gates

Environment variables are validated at bootstrap by the Zod schema in
[src/config/env.ts](src/config/env.ts); the process refuses to start on an
invalid or missing value.
