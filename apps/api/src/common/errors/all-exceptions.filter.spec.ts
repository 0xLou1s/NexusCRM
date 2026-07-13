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
import { DomainError, type DomainErrorKind } from "./domain-error"

class QuotaExceededError extends DomainError {
  readonly kind: DomainErrorKind = "quota_exceeded"
  readonly code = "ZALO_QUOTA_EXCEEDED"
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

  it("maps a domain error's kind onto a status and keeps its code", () => {
    const { status, body } = respondTo(
      new QuotaExceededError("Daily message cap reached", { limit: 200 })
    )

    expect(status).toBe(429)
    expect(body).toEqual({
      code: "ZALO_QUOTA_EXCEEDED",
      message: "Daily message cap reached",
      details: { limit: 200 },
    })
  })

  it("reports a rejected request as one issue per invalid field", () => {
    const { error } = z
      .object({ email: z.email() })
      .safeParse({ email: "nope" })

    const { status, body } = respondTo(new ZodValidationException(error))

    expect(status).toBe(400)
    expect(body.code).toBe("VALIDATION_FAILED")
    expect(body.details).toEqual({
      issues: [
        { path: "email", message: expect.any(String), code: "invalid_format" },
      ],
    })
  })

  it("gives Nest's own exceptions the same vocabulary as domain errors", () => {
    expect(respondTo(new NotFoundException())).toMatchObject({
      status: 404,
      body: { code: "NOT_FOUND" },
    })
    expect(respondTo(new ForbiddenException())).toMatchObject({
      status: 403,
      body: { code: "FORBIDDEN" },
    })
  })

  // An unhandled throw is a bug on our side. What it says — a connection string,
  // a stack, a query — belongs in the log, never in the response.
  it("says nothing about an unexpected failure beyond 500", () => {
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {})

    const { status, body } = respondTo(
      new Error("connect ECONNREFUSED 10.0.0.1:5432 as user postgres")
    )

    expect(status).toBe(500)
    expect(body).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    })
    expect(log).toHaveBeenCalled()
  })
})
