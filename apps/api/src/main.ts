import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import { SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { configureApp } from "./app.setup"
import type { Env } from "./config/env"
import { buildOpenApiDocument } from "./openapi"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  configureApp(app)

  const config = app.get(ConfigService<Env, true>)

  // Never "*": the session is a cookie, and browsers refuse a wildcard together
  // with credentials.
  app.enableCors({
    origin: config.get("WEB_ORIGIN", { infer: true }),
    credentials: true,
  })

  // Never in production: Swagger exposes the whole API surface. /openapi.json is
  // what `pnpm gen:api-types` reads.
  if (config.get("NODE_ENV", { infer: true }) !== "production") {
    SwaggerModule.setup("docs", app, buildOpenApiDocument(app), {
      jsonDocumentUrl: "openapi.json",
    })
  }

  await app.listen(config.get("PORT", { infer: true }))
}
void bootstrap()
