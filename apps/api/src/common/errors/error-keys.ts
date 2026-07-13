/**
 * Every error the API can name, as an i18n key.
 *
 * The key IS the `code` on the wire — one identifier, so a code and a
 * translation key can never drift apart. The frontend renders an error as
 * `t(error.code, error.params)` and never reads `message`, which stays English
 * for logs and for the public API consumers of Phase 11, who have no dictionary.
 *
 * Namespaces are modules: `common` and `validation` are shared by everything,
 * everything else is owned by the module it is named after. A module declares
 * its keys here and its error classes in `<module>/<module>.errors.ts`.
 */
export const ERROR_KEYS = {
  common: {
    internal: "common.internal",
    validationFailed: "common.validationFailed",
    responseContractViolation: "common.responseContractViolation",
    badRequest: "common.badRequest",
    unauthenticated: "common.unauthenticated",
    forbidden: "common.forbidden",
    notFound: "common.notFound",
    conflict: "common.conflict",
    tooManyRequests: "common.tooManyRequests",
    unavailable: "common.unavailable",
  },

  // One per Zod issue code. The filter derives these from the rejection itself,
  // so a schema gets field-level i18n without authoring a key per field.
  validation: {
    invalidType: "validation.invalidType",
    invalidValue: "validation.invalidValue",
    invalidFormat: "validation.invalidFormat",
    invalidUnion: "validation.invalidUnion",
    invalidKey: "validation.invalidKey",
    invalidElement: "validation.invalidElement",
    tooSmall: "validation.tooSmall",
    tooBig: "validation.tooBig",
    notMultipleOf: "validation.notMultipleOf",
    unrecognizedKeys: "validation.unrecognizedKeys",
    custom: "validation.custom",
  },

  health: {
    appMetaMissing: "health.appMetaMissing",
  },
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
