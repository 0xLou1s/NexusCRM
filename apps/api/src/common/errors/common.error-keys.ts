export const COMMON_ERROR_KEYS = {
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
} as const

// One per Zod issue code, so a schema gets field-level i18n without anyone
// authoring a key per field.
export const VALIDATION_ERROR_KEYS = {
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
} as const
