import { handleApiError } from "@/lib/forms/handle-api-error"
import { toastError } from "@/lib/toast"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }))

const toastErrorMock = vi.mocked(toastError)

describe("handleApiError", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("puts each issue on the input it names, translated by its code", () => {
    const setError = vi.fn()

    handleApiError(
      {
        code: "common.validationFailed",
        message: "The request failed validation",
        issues: [
          {
            path: "password",
            code: "validation.tooSmall",
            message: "Too small",
            params: { minimum: 8 },
          },
        ],
      },
      setError
    )

    expect(setError).toHaveBeenCalledExactlyOnceWith("password", {
      type: "server",
      message: "Must be at least 8 characters.",
    })
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it("places a domain error that carries an issue", () => {
    const setError = vi.fn()

    handleApiError(
      {
        code: "auth.emailAlreadyTaken",
        message: "That email is already registered",
        issues: [
          {
            path: "email",
            code: "auth.emailAlreadyTaken",
            message: "That email is already registered",
          },
        ],
      },
      setError
    )

    expect(setError).toHaveBeenCalledExactlyOnceWith("email", {
      type: "server",
      message: "That email already belongs to a user.",
    })
  })

  it("toasts an error that names no field", () => {
    const setError = vi.fn()

    handleApiError(
      { code: "auth.invalidCredentials", message: "Invalid email or password" },
      setError
    )

    expect(setError).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledExactlyOnceWith({
      title: "Sign-in failed",
      description: "That email and password do not match.",
    })
  })

  it("toasts a failure that never reached the API", () => {
    handleApiError(new TypeError("Failed to fetch"))

    expect(toastErrorMock).toHaveBeenCalledExactlyOnceWith({
      title: "Cannot reach the server",
      description: "Check your connection and try again.",
    })
  })
})
