const UNIQUE_VIOLATION = "23505"

// Drizzle wraps driver failures in a DrizzleQueryError, so the SQLSTATE sits one
// or more `cause` levels below the error that was thrown.
const MAX_CAUSE_DEPTH = 5

// Reading the index's verdict after the write, rather than SELECTing before it,
// is the only version without a race.
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
