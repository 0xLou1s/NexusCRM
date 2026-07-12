import { Controller, Get, ServiceUnavailableException } from "@nestjs/common"
import { ApiOperation } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { HealthDto } from "./health.dto"
import { HealthService } from "./health.service"

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * `@ZodResponse` is what keeps the three representations of this response in
   * step: it serializes through the DTO, documents it in OpenAPI, and fails the
   * build if the returned value stops matching the schema.
   */
  @Get()
  @ApiOperation({ summary: "Liveness of the API and its database" })
  @ZodResponse({ status: 200, type: HealthDto })
  async check() {
    const meta = await this.healthService.readAppMeta()

    if (!meta) {
      throw new ServiceUnavailableException(
        "app_meta is empty: migrations have not been applied"
      )
    }

    return { status: "ok" as const, meta }
  }
}
