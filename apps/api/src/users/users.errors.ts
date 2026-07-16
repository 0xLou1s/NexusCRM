import {
  DomainError,
  type DomainErrorKind,
} from "../common/errors/domain-error"
import { ERROR_KEYS, type ErrorKey } from "../common/errors/error-keys"

export class UserNotFoundError extends DomainError {
  readonly kind: DomainErrorKind = "not_found"
  readonly code: ErrorKey = ERROR_KEYS.users.notFound

  constructor() {
    super("No such user in this organization")
  }
}

export class CannotManageUserError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.users.cannotManageUser

  constructor() {
    super("You may only manage users below your own role")
  }
}

export class CannotAssignRoleError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.users.cannotAssignRole

  constructor() {
    super("You may not grant that role")
  }
}

export class CannotDemoteSelfError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.users.cannotDemoteSelf

  constructor() {
    super("You cannot change your own role")
  }
}

export class CannotDeactivateSelfError extends DomainError {
  readonly kind: DomainErrorKind = "forbidden"
  readonly code: ErrorKey = ERROR_KEYS.users.cannotDeactivateSelf

  constructor() {
    super("You cannot deactivate yourself")
  }
}

// A team from another organization is reported as missing, not forbidden: its
// existence is not something a caller in this organization gets to learn.
export class TeamNotFoundError extends DomainError {
  readonly kind: DomainErrorKind = "not_found"
  readonly code: ErrorKey = ERROR_KEYS.users.teamNotFound

  constructor() {
    const message = "No such team in this organization"

    super(message, {
      issues: [
        {
          path: "teamId",
          code: ERROR_KEYS.users.teamNotFound,
          message,
        },
      ],
    })
  }
}
