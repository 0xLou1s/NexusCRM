export type DomainErrorKind =
  | "invalid"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "quota_exceeded"
  | "unavailable"

export abstract class DomainError extends Error {
  // Not an HTTP status: AllExceptionsFilter owns that mapping, so a service can
  // throw this from a queue consumer or a cron job just as well (spec §7).
  abstract readonly kind: DomainErrorKind

  // Machine-readable and part of the contract: it reaches the frontend as
  // `code` in the error body.
  abstract readonly code: string

  constructor(
    message: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = new.target.name
  }
}
