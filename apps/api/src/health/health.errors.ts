import {
  DomainError,
  type DomainErrorKind,
} from "../common/errors/domain-error"
import { ERROR_KEYS, type ErrorKey } from "../common/errors/error-keys"

// "unavailable" rather than a 500: the API is up, the schema it expects is not.
export class AppMetaMissingError extends DomainError {
  readonly kind: DomainErrorKind = "unavailable"
  readonly code: ErrorKey = ERROR_KEYS.health.appMetaMissing

  constructor() {
    super("app_meta is empty: migrations have not been applied")
  }
}
