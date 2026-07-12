import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import { SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import type { Env } from "./config/env"
import { buildOpenApiDocument } from "./openapi"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()

  const config = app.get(ConfigService<Env, true>)

  // The frontend is a different origin (:3000 vs :3001) and the session is a
  // cookie, so the browser sends nothing unless the API names the origin and
  // allows credentials (spec §6).
  app.enableCors({
    origin: config.get("WEB_ORIGIN", { infer: true }),
    credentials: true,
  })

  // The UI exposes the entire API surface, so it is a development affordance
  // only: production drops it or puts it behind auth (spec §7).
  //
  // `/openapi.json` is not just documentation — it is the source `pnpm
  // gen:api-types` reads to regenerate the frontend's types, so any environment
  // a frontend developer generates against must serve it.
  if (config.get("NODE_ENV", { infer: true }) !== "production") {
    SwaggerModule.setup("docs", app, buildOpenApiDocument(app), {
      jsonDocumentUrl: "openapi.json",
    })
  }

  await app.listen(config.get("PORT", { infer: true }))
}
void bootstrap()
