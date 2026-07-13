import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common"
import type { Response } from "express"
import { ZodSerializationException, ZodValidationException } from "nestjs-zod"
import { ZodError } from "zod"
import type { ApiError } from "./api-error.dto"
import { DomainError, type DomainErrorKind } from "./domain-error"
import { ERROR_KEYS, type ErrorKey } from "./error-keys"
import { toErrorIssue } from "./zod-issue"

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  // 422, not 400: the request parsed fine, it is its contents that are wrong.
  // 400 is left to Nest, for a body it could not read at all.
  invalid: HttpStatus.UNPROCESSABLE_ENTITY,
  unauthenticated: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  quota_exceeded: HttpStatus.TOO_MANY_REQUESTS,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
}

// Nest throws its own exceptions before any of our code runs — an unmatched
// route, a body it cannot parse. They answer in the same vocabulary as a domain
// error, so the frontend has one thing to translate rather than two.
const KEY_BY_STATUS: Record<number, ErrorKey | undefined> = {
  [HttpStatus.BAD_REQUEST]: ERROR_KEYS.common.badRequest,
  [HttpStatus.UNAUTHORIZED]: ERROR_KEYS.common.unauthenticated,
  [HttpStatus.FORBIDDEN]: ERROR_KEYS.common.forbidden,
  [HttpStatus.NOT_FOUND]: ERROR_KEYS.common.notFound,
  [HttpStatus.CONFLICT]: ERROR_KEYS.common.conflict,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ERROR_KEYS.common.validationFailed,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_KEYS.common.tooManyRequests,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_KEYS.common.unavailable,
}

interface Failure {
  status: number
  body: ApiError
  // Logged, never sent: a 5xx is a bug on our side, not information for the caller.
  cause?: unknown
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body, cause } = this.toFailure(exception)

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${body.code}: ${describe(exception)}`,
        cause instanceof Error ? cause.stack : undefined
      )
    }

    host.switchToHttp().getResponse<Response>().status(status).json(body)
  }

  private toFailure(exception: unknown): Failure {
    if (exception instanceof DomainError) {
      return {
        status: STATUS_BY_KIND[exception.kind],
        body: {
          code: exception.code,
          message: exception.message,
          params: exception.params,
          issues: exception.issues,
        },
      }
    }

    if (exception instanceof ZodValidationException) {
      const error = exception.getZodError()

      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        body: {
          code: ERROR_KEYS.common.validationFailed,
          message: "The request failed validation",
          issues:
            error instanceof ZodError
              ? error.issues.map(toErrorIssue)
              : undefined,
        },
      }
    }

    // A response that fails its own DTO is a broken contract on our side, so the
    // caller gets a plain 500 and the Zod error goes to the log.
    if (exception instanceof ZodSerializationException) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          code: ERROR_KEYS.common.responseContractViolation,
          message: "The API produced a response that violates its own contract",
        },
        cause: exception.getZodError(),
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return {
        status,
        body: {
          code: KEY_BY_STATUS[status] ?? ERROR_KEYS.common.internal,
          message: exception.message,
        },
        cause: exception,
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ERROR_KEYS.common.internal,
        message: "Internal server error",
      },
      cause: exception,
    }
  }
}

function describe(exception: unknown): string {
  return exception instanceof Error ? exception.message : String(exception)
}
