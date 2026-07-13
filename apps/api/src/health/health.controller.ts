import { Controller, Get, HttpStatus } from "@nestjs/common"
import { ApiOperation, ApiResponse } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { ApiErrorDto } from "../common/errors/api-error.dto"
import { HealthDto } from "./health.dto"
import { HealthService } from "./health.service"

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Liveness of the API and its database" })
  @ZodResponse({ status: 200, type: HealthDto })
  // Not a @ZodResponse: that decorator binds a DTO to the handler's return
  // value, and an error is thrown rather than returned.
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: "The database is reachable but has not been migrated",
    type: ApiErrorDto,
  })
  async check() {
    const meta = await this.healthService.readAppMeta()

    return { status: "ok" as const, meta }
  }
}
