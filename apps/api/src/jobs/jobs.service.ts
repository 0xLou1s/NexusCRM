import { InjectQueue } from "@nestjs/bullmq"
import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common"
import { QUEUE_NAMES, type JobPayload } from "@workspace/contracts"
import type { Queue } from "bullmq"

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    @InjectQueue(QUEUE_NAMES.zalo) private readonly zaloQueue: Queue
  ) {}

  onApplicationBootstrap(): void {
    // Not awaited: `gen:api-types` boots the app with no Redis in reach, and
    // boot must not block on it.
    void this.enqueueNoop()
  }

  async enqueueNoop(): Promise<void> {
    const payload: JobPayload<"zalo.noop"> = {
      enqueuedAt: new Date().toISOString(),
    }
    try {
      await this.zaloQueue.add("zalo.noop", payload)
      this.logger.log(`Enqueued zalo.noop (enqueuedAt=${payload.enqueuedAt})`)
    } catch (error) {
      this.logger.error(
        "Failed to enqueue zalo.noop",
        error instanceof Error ? error.stack : String(error)
      )
    }
  }
}
