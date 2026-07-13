import { Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"
import { ActivityLogInterceptor } from "./activity-log.interceptor"
import { ActivityLogService } from "./activity-log.service"

@Module({
  providers: [
    ActivityLogService,
    // Every endpoint in the application, not only this module's: an audit trail
    // with an opt-in is an audit trail with holes in it.
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
  exports: [ActivityLogService],
})
export class ActivityModule {}
