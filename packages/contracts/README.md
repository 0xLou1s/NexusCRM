# @workspace/contracts

Everything OpenAPI cannot describe: the Socket.IO events and the BullMQ job
payloads that `api` and `zalo-worker` exchange through Redis.

REST is covered elsewhere — a Drizzle table becomes a Zod DTO, Swagger emits
`openapi.json`, and `@workspace/api-types` generates the frontend's types from
it. Sockets and queues have no such pipeline, so they are declared here instead:
once, and imported directly by every side.

## Layout

- `src/events.ts` — the Socket.IO event catalogue, and the `ServerToClientEvents` / `ClientToServerEvents` interfaces derived from it
- `src/jobs.ts` — the queue names and the job payload catalogue

Both catalogues are empty until the features that need them land.

## The shape

An event or a job is declared as a **Zod schema**; its TypeScript type is derived
from that schema rather than written a second time:

```ts
export const serverToClientEventSchemas = {
  "zalo:qr": z.object({ zaloAccountId: z.uuid(), qrDataUrl: z.string() }),
} as const satisfies EventSchemas

// ServerToClientEvents follows from the catalogue, so the gateway and
// socket.io-client cannot drift apart.
```

The schema is not decoration. Redis carries JSON: a job payload reaches the
worker as untyped data that merely happened to be typed when it left the API.
Consumers `parse` it instead of casting it, so a producer that changes a field
fails loudly in the consumer rather than reading `undefined` in production.

## Consumers

`apps/api`, `apps/zalo-worker` and `apps/web` all depend on this package. It has
exactly one runtime dependency, `zod`, and that is worth keeping: anything
Nest-specific or React-specific here would be pulled into the wrong process.
