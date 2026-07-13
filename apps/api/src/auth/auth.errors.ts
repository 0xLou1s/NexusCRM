import {
  DomainError,
  type DomainErrorKind,
} from "../common/errors/domain-error"
import { ERROR_KEYS, type ErrorKey } from "../common/errors/error-keys"

// One error for both "no such email" and "wrong password". Two would turn the
// login form into an account enumerator (spec §6).
export class InvalidCredentialsError extends DomainError {
  readonly kind: DomainErrorKind = "unauthenticated"
  readonly code: ErrorKey = ERROR_KEYS.auth.invalidCredentials

  constructor() {
    super("Invalid email or password")
  }
}

export class EmailAlreadyTakenError extends DomainError {
  readonly kind: DomainErrorKind = "conflict"
  readonly code: ErrorKey = ERROR_KEYS.auth.emailAlreadyTaken

  // The rule is about a field, so it rides in `issues` and the form prints it
  // under the email input — the same code path a Zod rejection takes.
  constructor() {
    const message = "That email is already registered"

    super(message, {
      issues: [
        {
          path: "email",
          code: ERROR_KEYS.auth.emailAlreadyTaken,
          message,
        },
      ],
    })
  }
}

// Registration is the bootstrap of the first organization, not a sign-up form:
// it answers exactly once, and refuses forever after (spec §6.1).
export class RegistrationClosedError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.auth.registrationClosed

  constructor() {
    super("Registration is closed: this instance already has an organization")
  }
}

export class InvalidRefreshTokenError extends DomainError {
  readonly kind: DomainErrorKind = "unauthenticated"
  readonly code: ErrorKey = ERROR_KEYS.auth.invalidRefreshToken

  constructor() {
    super("The refresh token is missing, expired or unknown")
  }
}

// A revoked token being presented means the previous holder still has it, which
// means it was stolen. Every session for that user dies (spec §6).
export class RefreshTokenReusedError extends DomainError {
  readonly kind: DomainErrorKind = "unauthenticated"
  readonly code: ErrorKey = ERROR_KEYS.auth.refreshTokenReused

  constructor() {
    super("This refresh token was already used; every session has been revoked")
  }
}

export class AccountDisabledError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.auth.accountDisabled

  constructor() {
    super("This account has been deactivated")
  }
}
