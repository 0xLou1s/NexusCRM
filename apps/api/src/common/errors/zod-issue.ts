import type { $ZodIssue } from "zod/v4/core"
import type { ErrorIssue } from "./api-error.dto"
import { ERROR_KEYS, type ErrorKey } from "./error-keys"

const KEY_BY_ISSUE_CODE: Record<$ZodIssue["code"], ErrorKey> = {
  invalid_type: ERROR_KEYS.validation.invalidType,
  invalid_value: ERROR_KEYS.validation.invalidValue,
  invalid_format: ERROR_KEYS.validation.invalidFormat,
  invalid_union: ERROR_KEYS.validation.invalidUnion,
  invalid_key: ERROR_KEYS.validation.invalidKey,
  invalid_element: ERROR_KEYS.validation.invalidElement,
  too_small: ERROR_KEYS.validation.tooSmall,
  too_big: ERROR_KEYS.validation.tooBig,
  not_multiple_of: ERROR_KEYS.validation.notMultipleOf,
  unrecognized_keys: ERROR_KEYS.validation.unrecognizedKeys,
  custom: ERROR_KEYS.validation.custom,
}

// The constraint that failed rides along as params, so the sentence stays in the
// dictionary and the number stays in the schema.
export function toErrorIssue(issue: $ZodIssue): ErrorIssue {
  const { code, path, message, ...rest } = issue
  const params = "params" in issue ? issue.params : rest

  const custom = readCustomKey(issue)

  return {
    path: path.map(String).join("."),
    code: custom ?? KEY_BY_ISSUE_CODE[code],
    message,
    ...(hasEntries(params) ? { params: publishable(params) } : {}),
  }
}

/**
 * Authors a `.refine()` that carries an i18n key, since only the author of a
 * rule knows what it means. Zod has nowhere to put a key, so it travels in
 * `params` and `readCustomKey` lifts it out.
 */
export function customIssue(
  key: ErrorKey,
  message: string,
  params?: Record<string, unknown>
) {
  return { message, params: { key, ...params } }
}

function readCustomKey(issue: $ZodIssue): ErrorKey | undefined {
  if (issue.code !== "custom") return undefined

  const key = issue.params?.key
  return typeof key === "string" ? (key as ErrorKey) : undefined
}

// `key` is the smuggling channel above. `pattern` is the compiled regex behind a
// format check: no sentence interpolates a regex, and publishing one only hands
// out the rule.
const PRIVATE_PARAMS = new Set(["key", "pattern"])

function publishable(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([name]) => !PRIVATE_PARAMS.has(name))
  )
}

function hasEntries(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(publishable(value as Record<string, unknown>)).length > 0
  )
}
