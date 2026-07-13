import type { ErrorIssue } from "./api-error.dto"
import type { ErrorKey } from "./error-keys"

export type DomainErrorKind =
  | "invalid"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "quota_exceeded"
  | "unavailable"

export interface DomainErrorOptions {
  // Interpolated into the translation of `code`: { minimum: 8 } lets the
  // sentence state the constraint without restating the number.
  params?: Record<string, unknown>
  issues?: ErrorIssue[]
}

/**
 * `kind` is not an HTTP status — AllExceptionsFilter owns that mapping, so a
 * service can throw this from a queue consumer or a cron job just as well.
 *
 * `code` is the i18n key the frontend translates. The `message` is English and
 * is only ever read by a log or a public API consumer.
 */
export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind
  abstract readonly code: ErrorKey

  readonly params?: Record<string, unknown>
  readonly issues?: ErrorIssue[]

  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message)
    this.name = new.target.name
    this.params = options.params
    this.issues = options.issues
  }
}
