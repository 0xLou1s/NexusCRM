import type { MessagesFor } from "@/lib/i18n/types"

export const COMMON_MESSAGES: MessagesFor<"common"> = {
  "common.internal": {
    title: "Something went wrong",
    description: "It failed on our side. Please try again.",
  },
  "common.validationFailed": {
    title: "Invalid details",
    description: "Some of the details sent were not valid.",
  },
  "common.responseContractViolation": {
    title: "Something went wrong",
    description:
      "The server sent an answer we could not read. Please try again.",
  },
  "common.badRequest": {
    title: "Bad request",
    description: "That request could not be read.",
  },
  "common.unauthenticated": {
    title: "Session ended",
    description: "Please sign in again.",
  },
  "common.forbidden": {
    title: "Not allowed",
    description: "You do not have access to this.",
  },
  "common.notFound": {
    title: "Not found",
    description: "We could not find what you asked for.",
  },
  "common.conflict": {
    title: "Conflict",
    description: "That conflicts with something that already exists.",
  },
  "common.tooManyRequests": {
    title: "Too many requests",
    description: "Please slow down and try again in a moment.",
  },
  "common.unavailable": {
    title: "Service unavailable",
    description:
      "The service is temporarily unavailable. Please try again shortly.",
  },
}

// `{minimum}` and friends interpolate the failed constraint out of the issue's
// params: the number stays in the backend's Zod schema, so raising min(8) to
// min(12) leaves nothing here to update.
export const VALIDATION_MESSAGES: MessagesFor<"validation"> = {
  "validation.invalidType": {
    title: "Wrong type",
    description: "This value has the wrong type.",
  },
  "validation.invalidValue": {
    title: "Not allowed",
    description: "This value is not allowed.",
  },
  "validation.invalidFormat": {
    title: "Invalid format",
    description: "This is not a valid {format}.",
  },
  "validation.invalidUnion": {
    title: "Not allowed",
    description: "This value does not match any allowed form.",
  },
  "validation.invalidKey": {
    title: "Invalid key",
    description: "This contains a key that is not allowed.",
  },
  "validation.invalidElement": {
    title: "Invalid item",
    description: "This contains an item that is not allowed.",
  },
  "validation.tooSmall": {
    title: "Too short",
    description: "Must be at least {minimum} characters.",
  },
  "validation.tooBig": {
    title: "Too long",
    description: "Must be at most {maximum} characters.",
  },
  "validation.notMultipleOf": {
    title: "Invalid number",
    description: "Must be a multiple of {divisor}.",
  },
  "validation.unrecognizedKeys": {
    title: "Unexpected fields",
    description: "This contains fields that are not accepted.",
  },
  "validation.custom": {
    title: "Not allowed",
    description: "This value is not allowed.",
  },
}
