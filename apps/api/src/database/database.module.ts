import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createDatabase, type DatabaseConnection } from "@workspace/db"
import type { Env } from "../config/env"

export const DATABASE_CONNECTION = "DATABASE_CONNECTION"

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): DatabaseConnection =>
        createDatabase({ url: config.get("DATABASE_URL", { infer: true }) }),
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close()
  }
}
