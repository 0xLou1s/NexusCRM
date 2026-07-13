import type { components } from "@workspace/api-types"

export type ApiError = components["schemas"]["ApiErrorDto"]
export type ErrorKey = ApiError["code"]

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  )
}
