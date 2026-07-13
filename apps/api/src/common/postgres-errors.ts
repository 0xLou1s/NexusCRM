const UNIQUE_VIOLATION = "23505"
const MAX_CAUSE_DEPTH = 5

/**
 * Whether a failed write hit a unique index.
 *
 * Checking the constraint after the fact rather than SELECTing before the INSERT
 * is the only version without a race: between a "does this email exist" query
 * and the insert, another request can take it. The index is the single source of
 * truth, so the code reads its verdict instead of predicting it.
 *
 * Drizzle wraps driver failures in a `DrizzleQueryError`, so the SQLSTATE sits
 * one or more `cause` levels below the error that was thrown.
 */
export function isUniqueViolation(error: unknown): boolean {
  return sqlStateOf(error) === UNIQUE_VIOLATION
}

function sqlStateOf(error: unknown): string | undefined {
  let current: unknown = error

  for (
    let depth = 0;
    current instanceof Error && depth < MAX_CAUSE_DEPTH;
    depth += 1
  ) {
    const { code } = current as Error & { code?: unknown }
    if (typeof code === "string") return code

    current = current.cause
  }

  return undefined
}
