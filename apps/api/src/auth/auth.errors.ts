import {
  DomainError,
  type DomainErrorKind,
} from "../common/errors/domain-error"
import { ERROR_KEYS, type ErrorKey } from "../common/errors/error-keys"

// Never split into "no such email" and "wrong password": two errors turn the
// login form into an account enumerator.
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
