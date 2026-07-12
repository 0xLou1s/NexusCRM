import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { QUEUE_NAMES } from "@workspace/contracts"
import { JobsService } from "./jobs.service"

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.zalo })],
  providers: [JobsService],
})
export class JobsModule {}
