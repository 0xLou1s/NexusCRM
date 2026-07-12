import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"
import { resolve } from "node:path"
import { validateEnv } from "./config/env"
import { DatabaseModule } from "./database/database.module"
import { HealthModule } from "./health/health.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Scripts run with cwd = apps/api, and the workspace keeps a single .env
      // at the repository root. A missing file is fine: containers and CI pass
      // the variables in the environment instead.
      envFilePath: resolve(process.cwd(), "../../.env"),
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [
    // Requests are parsed by the Zod schema behind each DTO...
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // ...and responses are re-parsed by it on the way out, so a handler that
    // drifts from its contract fails here rather than in the browser.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
