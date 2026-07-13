import {
  ForbiddenException,
  Logger,
  NotFoundException,
  type ArgumentsHost,
} from "@nestjs/common"
import { ZodValidationException } from "nestjs-zod"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { AllExceptionsFilter } from "./all-exceptions.filter"
import type { ApiError } from "./api-error.dto"
import { ConflictError } from "./common.errors"
import { DomainError, type DomainErrorKind } from "./domain-error"
import { ERROR_KEYS, type ErrorKey } from "./error-keys"
import { customIssue } from "./zod-issue"

class QuotaExceededError extends DomainError {
  readonly kind: DomainErrorKind = "quota_exceeded"
  readonly code: ErrorKey = ERROR_KEYS.common.tooManyRequests
}

function respondTo(exception: unknown): { status: number; body: ApiError } {
  let captured: { status: number; body: ApiError } | undefined

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (status: number) => ({
          json: (body: ApiError) => {
            captured = { status, body }
          },
        }),
      }),
    }),
  } as unknown as ArgumentsHost

  new AllExceptionsFilter().catch(exception, host)

  if (!captured) throw new Error("the filter did not respond")
  return captured
}

describe("AllExceptionsFilter", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("maps a domain error's kind onto a status and sends its key", () => {
    const { status, body } = respondTo(
      new QuotaExceededError("Daily message cap reached", {
        params: { limit: 200 },
      })
    )

    expect(status).toBe(429)
    expect(body).toEqual({
      code: "common.tooManyRequests",
      message: "Daily message cap reached",
      params: { limit: 200 },
      issues: undefined,
    })
  })

  it("rejects invalid contents as 422 with one issue per field", () => {
    const { error } = z
      .object({ email: z.email(), password: z.string().min(8) })
      .safeParse({ email: "nope", password: "short" })

    const { status, body } = respondTo(new ZodValidationException(error))

    expect(status).toBe(422)
    expect(body.code).toBe("common.validationFailed")
    expect(body.issues).toEqual([
      {
        path: "email",
        code: "validation.invalidFormat",
        message: expect.any(String),
        params: expect.objectContaining({ format: "email" }),
      },
      {
        path: "password",
        code: "validation.tooSmall",
        message: expect.any(String),
        // The constraint travels with the issue, so a translation can say "at
        // least 8" without 8 being written down a second time.
        params: expect.objectContaining({ minimum: 8 }),
      },
    ])
  })

  it("takes a refine's key from customIssue and keeps its English message", () => {
    const { error } = z
      .object({ password: z.string(), confirmPassword: z.string() })
      .refine((value) => value.password === value.confirmPassword, {
        ...customIssue(ERROR_KEYS.validation.custom, "Passwords do not match"),
        path: ["confirmPassword"],
      })
      .safeParse({ password: "a", confirmPassword: "b" })

    const { body } = respondTo(new ZodValidationException(error))

    expect(body.issues).toEqual([
      {
        path: "confirmPassword",
        code: "validation.custom",
        message: "Passwords do not match",
      },
    ])
  })

  it("keeps Zod's compiled regex out of the params it publishes", () => {
    const { error } = z.object({ email: z.email() }).safeParse({ email: "no" })

    const { body } = respondTo(new ZodValidationException(error))

    expect(body.issues?.[0]?.params).toEqual({
      origin: "string",
      format: "email",
    })
  })

  it("carries a nested field's dotted path through to the issue", () => {
    const { error } = z
      .object({ profile: z.object({ phone: z.string().min(10) }) })
      .safeParse({ profile: { phone: "1" } })

    const { body } = respondTo(new ZodValidationException(error))

    expect(body.issues?.[0]?.path).toBe("profile.phone")
  })

  it("lets a domain error blame a field", () => {
    const { status, body } = respondTo(
      new ConflictError("That email is already registered", {
        issues: [
          {
            path: "email",
            code: ERROR_KEYS.common.conflict,
            message: "That email is already registered",
          },
        ],
      })
    )

    expect(status).toBe(409)
    expect(body.code).toBe("common.conflict")
    expect(body.issues).toEqual([
      {
        path: "email",
        code: "common.conflict",
        message: "That email is already registered",
      },
    ])
  })

  it("gives Nest's own exceptions the same vocabulary as domain errors", () => {
    expect(respondTo(new NotFoundException())).toMatchObject({
      status: 404,
      body: { code: "common.notFound" },
    })
    expect(respondTo(new ForbiddenException())).toMatchObject({
      status: 403,
      body: { code: "common.forbidden" },
    })
  })

  it("says nothing about an unexpected failure beyond 500", () => {
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {})

    const { status, body } = respondTo(
      new Error("connect ECONNREFUSED 10.0.0.1:5432 as user postgres")
    )

    expect(status).toBe(500)
    expect(body).toEqual({
      code: "common.internal",
      message: "Internal server error",
    })
    expect(log).toHaveBeenCalled()
  })
})
