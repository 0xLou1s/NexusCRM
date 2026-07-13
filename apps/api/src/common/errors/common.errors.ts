import { DomainError, type DomainErrorKind } from "./domain-error"
import { ERROR_KEYS, type ErrorKey } from "./error-keys"

// Last resort, for a failure that carries no meaning beyond its shape. A module
// with something to say declares its own class and key: "conflict" is not
// something a user can act on, "auth.emailAlreadyTaken" is.

export class UnauthenticatedError extends DomainError {
  readonly kind: DomainErrorKind = "unauthenticated"
  readonly code: ErrorKey = ERROR_KEYS.common.unauthenticated
}

export class ForbiddenError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.common.forbidden
}

export class ConflictError extends DomainError {
  readonly kind: DomainErrorKind = "conflict"
  readonly code: ErrorKey = ERROR_KEYS.common.conflict
}
