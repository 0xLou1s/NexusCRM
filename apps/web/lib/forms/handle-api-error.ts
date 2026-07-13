import { isApiError } from "@/lib/api/errors"
import { describeError, describeIssue } from "@/lib/i18n/error-messages"
import { toastError } from "@/lib/toast"
import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

/**
 * An error that names fields belongs under those fields; anything else belongs
 * in a toast. The API's dotted `path` ("profile.phone") is already how
 * react-hook-form names a nested field, so the cast below is safe.
 */
export function handleApiError<TFields extends FieldValues>(
  error: unknown,
  setError?: UseFormSetError<TFields>
): void {
  const issues = isApiError(error) ? (error.issues ?? []) : []

  if (setError && issues.length > 0) {
    for (const issue of issues) {
      setError(issue.path as Path<TFields>, {
        type: "server",
        message: describeIssue(issue),
      })
    }

    return
  }

  toastError(describeError(error))
}
