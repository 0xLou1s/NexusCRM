import {
  DomainError,
  type DomainErrorKind,
} from "../common/errors/domain-error"
import { ERROR_KEYS, type ErrorKey } from "../common/errors/error-keys"

// An empty app_meta means the schema this build expects was never applied, so
// the API is up but unusable — hence "unavailable" rather than a 500.
export class AppMetaMissingError extends DomainError {
  readonly kind: DomainErrorKind = "unavailable"
  readonly code: ErrorKey = ERROR_KEYS.health.appMetaMissing

  constructor() {
    super("app_meta is empty: migrations have not been applied")
  }
}
