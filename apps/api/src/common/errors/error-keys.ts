import { AUTH_ERROR_KEYS } from "../../auth/auth.error-keys"
import { HEALTH_ERROR_KEYS } from "../../health/health.error-keys"
import { COMMON_ERROR_KEYS, VALIDATION_ERROR_KEYS } from "./common.error-keys"

/**
 * Every error the API can name, as an i18n key.
 *
 * The key IS the `code` on the wire — one identifier, so a code and a
 * translation key can never drift apart. The frontend renders an error as
 * `t(error.code, error.params)` and never reads `message`, which stays English
 * for logs and for the public API consumers of Phase 11, who have no dictionary.
 *
 * Namespaces are modules. `common` and `validation` are shared by everything and
 * live next to this file; every other namespace is declared by the module it
 * names — `<module>/<module>.error-keys.ts`, beside the error classes in
 * `<module>/<module>.errors.ts` — and is only composed here. A module that grows
 * a key touches its own file; this one only ever gains a line.
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

// Flat, in declaration order — this is what the DTO turns into a Zod enum, so a
// key the frontend has no translation for becomes a compile error there.
export const ERROR_KEY_VALUES = Object.values(ERROR_KEYS).flatMap((namespace) =>
  Object.values(namespace)
) as [ErrorKey, ...ErrorKey[]]
