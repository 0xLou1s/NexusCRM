import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"
import { resolve } from "node:path"
import { ActivityModule } from "./activity/activity.module"
import { AuthModule } from "./auth/auth.module"
import { AllExceptionsFilter } from "./common/errors/all-exceptions.filter"
import { validateEnv, type Env } from "./config/env"
import { DatabaseModule } from "./database/database.module"
import { HealthModule } from "./health/health.module"
import { JobsModule } from "./jobs/jobs.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Scripts run with cwd = apps/api; the workspace keeps one .env at the
      // repository root. A missing file is fine: containers and CI pass the
      // variables in the environment instead.
      envFilePath: resolve(process.cwd(), "../../.env"),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: { url: config.get("REDIS_URL", { infer: true }) },
      }),
    }),
    DatabaseModule,
    HealthModule,
    JobsModule,
    AuthModule,
    ActivityModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Responses are re-parsed by the DTO on the way out, so a handler that
    // drifts from its contract fails here rather than in the browser.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
