import { z, type ZodType } from "zod"

/** The queues `api` produces into and `zalo-worker` consumes from. */
export const QUEUE_NAMES = {
  zalo: "zalo",
} as const satisfies Record<string, string>

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

/** Job name -> Zod schema of its payload. */
export type JobSchemas = Record<string, ZodType>

/**
 * The jobs `api` enqueues for `zalo-worker`.
 *
 * Redis carries JSON across the process boundary, so a consumer parses a
 * payload through its schema instead of casting it.
 */
export const jobSchemas = {
  // No-op probe from the walking skeleton: proves api -> worker without HTTP.
  "zalo.noop": z.object({
    enqueuedAt: z.iso.datetime(),
  }),
} as const satisfies JobSchemas

export type JobName = keyof typeof jobSchemas

export type JobPayload<TName extends JobName> = z.infer<
  (typeof jobSchemas)[TName]
>
