import { DomainError, type DomainErrorKind } from "./domain-error"
import { ERROR_KEYS, type ErrorKey } from "./error-keys"

/**
 * The errors any module may throw, for failures that carry no meaning beyond
 * the shape of the failure itself.
 *
 * A module reaches for one of these only when it has nothing more specific to
 * say. When it does — "this email is taken", "that Zalo account is not
 * connected" — it declares its own class in `<module>/<module>.errors.ts` with
 * its own key, because "conflict" is not something a user can act on and
 * "auth.emailAlreadyTaken" is.
 */

export class NotFoundError extends DomainError {
  readonly kind: DomainErrorKind = "not_found"
  readonly code: ErrorKey = ERROR_KEYS.common.notFound
}

export class ForbiddenError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.common.forbidden
}

export class UnauthenticatedError extends DomainError {
  readonly kind: DomainErrorKind = "unauthenticated"
  readonly code: ErrorKey = ERROR_KEYS.common.unauthenticated
}

export class ConflictError extends DomainError {
  readonly kind: DomainErrorKind = "conflict"
  readonly code: ErrorKey = ERROR_KEYS.common.conflict
}

export class InvalidError extends DomainError {
  readonly kind: DomainErrorKind = "invalid"
  readonly code: ErrorKey = ERROR_KEYS.common.validationFailed
}
