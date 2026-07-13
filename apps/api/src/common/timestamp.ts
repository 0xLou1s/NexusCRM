import { z } from "zod"

/**
 * Every timestamp column is refined with this codec. drizzle-zod maps a
 * `timestamptz` to `z.date()`, which has no JSON Schema representation at all;
 * the row keeps its `Date` inside the API and the response carries ISO 8601.
 */
export const isoTimestamp = z.codec(z.date(), z.iso.datetime(), {
  decode: (date) => date.toISOString(),
  encode: (value) => new Date(value),
})
