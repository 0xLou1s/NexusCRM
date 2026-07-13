import type { INestApplication } from "@nestjs/common"
import {
  DocumentBuilder,
  getSchemaPath,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger"
import { cleanupOpenApiDoc } from "nestjs-zod"
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

// Reachable from every operation, whatever it does: the validation pipe rejects
// the request's own contents before the handler runs, and anything unhandled
// inside it leaves as a 500. Documented once here so no endpoint has to
// remember to. Every status reuses ApiErrorDto, so the frontend's `error` is one
// type rather than a union it has to narrow before reading `issues`.
const UNIVERSAL_ERRORS: Record<string, string> = {
  "422": "The request failed validation; `issues` names the fields",
  "500": "Unexpected server error",
}

/**
 * The one definition of the OpenAPI document.
 *
 * The Swagger UI at `/docs` and the document at `/openapi.json` — which
 * `gen:api-types` turns into the frontend's types — are the same object, so the
 * API a developer reads about and the API the frontend compiles against cannot
 * be different APIs.
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

  for (const item of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method]
      if (!operation) continue

      for (const [status, description] of Object.entries(UNIVERSAL_ERRORS)) {
        // An operation that documents the status itself keeps its own wording.
        operation.responses[status] ??= {
          description,
          content: { "application/json": { schema } },
        }
      }
    }
  }

  return document
}
