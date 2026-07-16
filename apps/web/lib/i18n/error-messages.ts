import { isApiError, type ApiError, type ErrorKey } from "@/lib/api/errors"
import { AUTH_MESSAGES } from "@/lib/i18n/messages/auth"
import {
  COMMON_MESSAGES,
  VALIDATION_MESSAGES,
} from "@/lib/i18n/messages/common"
import { HEALTH_MESSAGES } from "@/lib/i18n/messages/health"
import { USERS_MESSAGES } from "@/lib/i18n/messages/users"
import type { ErrorMessage } from "@/lib/i18n/types"

// `Record<ErrorKey, ErrorMessage>` is what makes this exhaustive: a key with no
// sentence is a compile error rather than an `undefined` on screen.
export const ERROR_MESSAGES: Record<ErrorKey, ErrorMessage> = {
  ...COMMON_MESSAGES,
  ...VALIDATION_MESSAGES,
  ...AUTH_MESSAGES,
  ...USERS_MESSAGES,
  ...HEALTH_MESSAGES,
}

const UNREACHABLE: ErrorMessage = {
  title: "Cannot reach the server",
  description: "Check your connection and try again.",
}

export function messageFor(
  code: ErrorKey,
  params?: Record<string, unknown>
): ErrorMessage {
  const message = ERROR_MESSAGES[code]

  return {
    title: interpolate(message.title, params),
    description: interpolate(message.description, params),
  }
}

// A failed request is not always an ApiError: the network can drop before the
// API ever answers.
export function describeError(error: unknown): ErrorMessage {
  if (isApiError(error)) return messageFor(error.code, error.params)

  return UNREACHABLE
}

export function describeIssue(
  issue: Pick<ApiError, "code" | "params">
): string {
  return messageFor(issue.code, issue.params).description
}

function interpolate(
  sentence: string,
  params: Record<string, unknown> | undefined
): string {
  if (!params) return sentence

  return sentence.replace(/{(\w+)}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder
  )
}
