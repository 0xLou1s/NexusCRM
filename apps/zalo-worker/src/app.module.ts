import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { resolve } from "node:path"
import { validateEnv, type Env } from "./config/env"
import { JobsModule } from "./jobs/jobs.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Scripts run with cwd = apps/zalo-worker, and the workspace keeps a
      // single .env at the repository root. A missing file is fine: containers
      // and CI pass the variables in the environment instead.
      envFilePath: resolve(process.cwd(), "../../.env"),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: { url: config.get("REDIS_URL", { infer: true }) },
      }),
    }),
    JobsModule,
  ],
})
export class AppModule {}
