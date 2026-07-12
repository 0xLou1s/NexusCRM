import { appMeta } from "@workspace/db"
import { createSelectSchema } from "drizzle-zod"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { isoTimestamp } from "../common/timestamp"

/**
 * The `app_meta` row, derived from the Drizzle table.
 *
 * Nothing about the shape is restated here: rename a column upstream and this
 * schema, the OpenAPI document and the frontend's generated types all move with
 * it. Only the wire format of the timestamp is stated, once.
 */
export const appMetaSchema = createSelectSchema(appMeta, {
  updatedAt: isoTimestamp,
})

export const healthSchema = z.object({
  status: z.literal("ok"),
  meta: appMetaSchema,
})

export class HealthDto extends createZodDto(healthSchema) {}
