import { HttpStatus, type INestApplication } from "@nestjs/common"
import {
  DocumentBuilder,
  getSchemaPath,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger"
import { cleanupOpenApiDoc } from "nestjs-zod"
import { PUBLIC_OPERATION_EXTENSION } from "./auth/decorators/public.decorator"
import { ApiErrorDto } from "./common/errors/api-error.dto"

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
] as const

// Reachable from every operation, whatever it does: the validation pipe runs
// before the handler, and anything unhandled inside it leaves as a 500.
const UNIVERSAL_ERRORS: Record<string, string> = {
  "422": "The request failed validation; `issues` names the fields",
  "500": "Unexpected server error",
}

const UNAUTHENTICATED = "No access token, or one that no longer verifies"

// The operation type has no index signature, but the document it comes from does
// carry the `x-` extensions @Public() writes onto it.
type PathItem = OpenAPIObject["paths"][string]
type ExtendedOperation = NonNullable<PathItem["get"]> & Record<string, unknown>

/**
 * The Swagger UI at `/docs` and the document at `/openapi.json` — which
 * `gen:api-types` turns into the frontend's types — are the same object, so the
 * API a developer reads about cannot differ from the one the frontend compiles
 * against.
 *
 * `cleanupOpenApiDoc` is nestjs-zod's post-processing step; without it the Zod
 * schemas reach the document as unusable placeholders.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("NexusCRM API")
    .setDescription(
      "Internal REST API. Types are declared here and generated for the frontend."
    )
    .setVersion("0.1.0")
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiErrorDto],
  })

  // Before the cleanup, not after: cleanupOpenApiDoc is what rewrites $refs, so
  // the references added here are rewritten along with the rest.
  return cleanupOpenApiDoc(withUniversalErrors(document))
}

function withUniversalErrors(document: OpenAPIObject): OpenAPIObject {
  const schema = { $ref: getSchemaPath(ApiErrorDto) }
  const errorResponse = (description: string) => ({
    description,
    content: { "application/json": { schema } },
  })

  for (const item of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method] as ExtendedOperation | undefined
      if (!operation) continue

      for (const [status, description] of Object.entries(UNIVERSAL_ERRORS)) {
        // An operation that documents the status itself keeps its own wording.
        operation.responses[status] ??= errorResponse(description)
      }

      // Everything the global JwtAuthGuard protects — which is everything that
      // did not opt out with @Public() — can answer 401 whatever else it does.
      const isPublic = operation[PUBLIC_OPERATION_EXTENSION] === true
      delete operation[PUBLIC_OPERATION_EXTENSION]

      if (!isPublic) {
        operation.responses[String(HttpStatus.UNAUTHORIZED)] ??=
          errorResponse(UNAUTHENTICATED)
      }
    }
  }

  return document
}
