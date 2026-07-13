import { Inject, Injectable, Logger } from "@nestjs/common"
import { activityLogs, type DatabaseConnection } from "@workspace/db"
import { DATABASE_CONNECTION } from "../database/database.module"

export interface ActivityEntry {
  orgId: string
  userId: string | null
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name)

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection
  ) {}

  // Swallowed on purpose: the action already happened, and failing the caller's
  // request now would neither undo it nor record it.
  async record(entry: ActivityEntry): Promise<void> {
    try {
      await this.connection.db.insert(activityLogs).values(entry)
    } catch (error) {
      this.logger.error(
        `Failed to record ${entry.action}`,
        error instanceof Error ? error.stack : String(error)
      )
    }
  }
}
