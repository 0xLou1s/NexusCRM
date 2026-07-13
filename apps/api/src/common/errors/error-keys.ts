import { AUTH_ERROR_KEYS } from "../../auth/auth.error-keys"
import { HEALTH_ERROR_KEYS } from "../../health/health.error-keys"
import { COMMON_ERROR_KEYS, VALIDATION_ERROR_KEYS } from "./common.error-keys"

/**
 * Every error the API can name. The key is the `code` on the wire, so a code and
 * a translation key can never drift apart.
 *
 * A namespace is a module and is declared in `<module>/<module>.error-keys.ts`,
 * then composed here. This file only ever gains a line.
 */
export const ERROR_KEYS = {
  common: COMMON_ERROR_KEYS,
  validation: VALIDATION_ERROR_KEYS,
  auth: AUTH_ERROR_KEYS,
  health: HEALTH_ERROR_KEYS,
} as const satisfies Record<string, Record<string, string>>

type Leaves<T> = T extends string
  ? T
  : { [K in keyof T]: Leaves<T[K]> }[keyof T]

export type ErrorKey = Leaves<typeof ERROR_KEYS>

// The DTO turns this into a Zod enum, so a key the frontend has no translation
// for becomes a compile error there.
export const ERROR_KEY_VALUES = Object.values(ERROR_KEYS).flatMap((namespace) =>
  Object.values(namespace)
) as [ErrorKey, ...ErrorKey[]]
