import { z } from "zod"

/**
 * How a Postgres timestamp crosses the wire.
 *
 * Drizzle hands a `timestamptz` column over as a `Date`, and JSON has no date
 * type — `drizzle-zod` maps the column to `z.date()`, which cannot be expressed
 * in JSON Schema at all. So every timestamp column is refined with this codec:
 * the row keeps its `Date` inside the API, the response carries an ISO 8601
 * string, and OpenAPI documents it as `string` / `date-time`.
 */
export const isoTimestamp = z.codec(z.date(), z.iso.datetime(), {
  decode: (date) => date.toISOString(),
  encode: (value) => new Date(value),
})
