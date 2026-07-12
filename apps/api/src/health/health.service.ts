import { Inject, Injectable } from "@nestjs/common"
import { appMeta, type AppMeta, type DatabaseConnection } from "@workspace/db"
import { DATABASE_CONNECTION } from "../database/database.module"

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection
  ) {}

  async readAppMeta(): Promise<AppMeta | undefined> {
    const [row] = await this.connection.db.select().from(appMeta).limit(1)
    return row
  }
}
