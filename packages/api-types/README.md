# @workspace/api-types

The frontend's view of the REST API: `schema.d.ts`, generated from the API's
OpenAPI document and committed.

**Never edit `schema.d.ts` by hand.** It is output, not source. The source is the
Drizzle table, the Zod schema derived from it, and the DTO the controller
returns:

```text
Drizzle table -> drizzle-zod -> ZodDto -> Swagger -> /openapi.json -> schema.d.ts
```

## Regenerating

```sh
pnpm gen:api-types   # from the repository root
```

It reads `<API_URL>/openapi.json` from a **running** API and runs
`openapi-typescript` over it. Point `API_URL` at whichever API you mean to
compile against:

| `API_URL`               | What you get                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `http://localhost:3001` | The backend in your working tree (`pnpm --filter api dev`)       |
| the deployed dev API    | A backend branch you have not checked out — the point of the URL |

Run it whenever the backend's DTOs or endpoints change, and commit the result in
the same PR. CI regenerates against an API it starts itself and diffs: a stale
`schema.d.ts` fails the build, because a frontend compiling against types the
backend no longer serves is the exact failure this package exists to prevent.

`/openapi.json` is only served when `NODE_ENV` is not `production` — an
environment you generate types from must therefore not run as production.
