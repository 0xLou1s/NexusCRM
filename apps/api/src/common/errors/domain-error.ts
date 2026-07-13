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
  // Interpolated into the translation of `code`, and available to the frontend
  // as data: { limit: 200, resetsAt } drives both the sentence and the countdown.
  params?: Record<string, unknown>
  // Blames the failure on named inputs. A domain rule that is about a field
  // ("this email is taken") is then rendered by the same code that renders a
  // Zod rejection.
  issues?: ErrorIssue[]
}

export abstract class DomainError extends Error {
  // Not an HTTP status: AllExceptionsFilter owns that mapping, so a service can
  // throw this from a queue consumer or a cron job just as well (spec §7).
  abstract readonly kind: DomainErrorKind

  // The i18n key, from the catalogue in error-keys.ts. It reaches the frontend
  // as `code` and is what gets translated; the `message` passed to super() is
  // English and is only ever read by a log or a public API consumer.
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
