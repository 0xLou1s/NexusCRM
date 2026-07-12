import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Logger } from "@nestjs/common"
import { jobSchemas, QUEUE_NAMES } from "@workspace/contracts"
import type { Job } from "bullmq"

@Processor(QUEUE_NAMES.zalo)
export class JobsService extends WorkerHost {
  private readonly logger = new Logger(JobsService.name)

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case "zalo.noop": {
        // Redis carries JSON across the process boundary: parse, never cast.
        const { enqueuedAt } = jobSchemas["zalo.noop"].parse(job.data)
        this.logger.log(`Consumed zalo.noop (enqueuedAt=${enqueuedAt})`)
        return
      }
      default:
        throw new Error(
          `Unknown job "${job.name}" on queue "${QUEUE_NAMES.zalo}"`
        )
    }
  }
}
