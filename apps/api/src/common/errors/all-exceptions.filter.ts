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

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  invalid: HttpStatus.BAD_REQUEST,
  unauthenticated: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  quota_exceeded: HttpStatus.TOO_MANY_REQUESTS,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
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
          details: exception.details,
        },
      }
    }

    if (exception instanceof ZodValidationException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          code: "VALIDATION_FAILED",
          message: "Request failed validation",
          details: issuesOf(exception.getZodError()),
        },
      }
    }

    // A response that fails its own DTO is a broken contract on our side, so the
    // caller gets a plain 500 and the Zod error goes to the log.
    if (exception instanceof ZodSerializationException) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          code: "RESPONSE_CONTRACT_VIOLATION",
          message: "The API produced a response that violates its own contract",
        },
        cause: exception.getZodError(),
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return {
        status,
        body: { code: codeFor(status), message: exception.message },
        cause: exception,
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
      cause: exception,
    }
  }
}

// HttpStatus is a numeric enum, so it reverse-maps a status onto its own name:
// 404 -> "NOT_FOUND". Nest's own exceptions — an unmatched route, a guard
// rejecting — then reach the client in the same vocabulary as domain errors.
function codeFor(status: number): string {
  return HttpStatus[status] ?? "INTERNAL_SERVER_ERROR"
}

function issuesOf(error: unknown): ApiError["details"] {
  if (!(error instanceof ZodError)) return undefined

  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
      code: issue.code,
    })),
  }
}

function describe(exception: unknown): string {
  return exception instanceof Error ? exception.message : String(exception)
}
