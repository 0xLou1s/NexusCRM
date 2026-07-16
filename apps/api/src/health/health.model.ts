import { appMeta } from "@workspace/db"
import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { isoTimestamp } from "../common/timestamp"

export const appMetaSchema = createSelectSchema(appMeta, {
  updatedAt: isoTimestamp,
})

export const healthSchema = z.object({
  status: z.literal("ok"),
  meta: appMetaSchema,
})
