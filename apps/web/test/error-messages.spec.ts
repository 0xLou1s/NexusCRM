import { safeNextPath } from "@/lib/auth"
import {
  describeError,
  describeIssue,
  messageFor,
} from "@/lib/i18n/error-messages"
import { describe, expect, it } from "vitest"

describe("error messages", () => {
  it("interpolates the failed constraint out of the issue's params", () => {
    expect(
      describeIssue({ code: "validation.tooSmall", params: { minimum: 8 } })
    ).toBe("Must be at least 8 characters.")
  })

  it("always carries a title as well as a description", () => {
    expect(messageFor("auth.accountDisabled")).toEqual({
      title: "Account deactivated",
      description: "This account has been deactivated.",
    })
  })

  it("leaves a placeholder alone when the API sent no value for it", () => {
    expect(messageFor("validation.tooSmall").description).toContain("{minimum}")
  })

  it("falls back when the failure never reached the API", () => {
    expect(describeError(new TypeError("Failed to fetch"))).toEqual({
      title: "Cannot reach the server",
      description: "Check your connection and try again.",
    })
  })

  it("translates an ApiError by its code, never by its English message", () => {
    expect(
      describeError({
        code: "auth.invalidCredentials",
        message: "Invalid email or password",
      })
    ).toEqual({
      title: "Sign-in failed",
      description: "That email and password do not match.",
    })
  })
})

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/contacts?page=2")).toBe("/contacts?page=2")
  })

  it.each([
    "//evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    undefined,
  ])("refuses %s, which would be an open redirect", (next) => {
    expect(safeNextPath(next)).toBe("/")
  })
})
