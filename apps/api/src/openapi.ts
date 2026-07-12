import type { INestApplication } from "@nestjs/common"
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger"
import { cleanupOpenApiDoc } from "nestjs-zod"

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

  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config))
}
