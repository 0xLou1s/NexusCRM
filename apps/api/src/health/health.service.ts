import { Inject, Injectable } from "@nestjs/common"
import { appMeta, type AppMeta, type DatabaseConnection } from "@workspace/db"
import { DATABASE_CONNECTION } from "../database/database.module"
import { AppMetaMissingError } from "./health.error"

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection
  ) {}

  async readAppMeta(): Promise<AppMeta> {
    const [row] = await this.connection.db.select().from(appMeta).limit(1)

    if (!row) throw new AppMetaMissingError()

    return row
  }
}
