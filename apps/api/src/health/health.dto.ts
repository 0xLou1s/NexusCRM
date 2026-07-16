import { createZodDto } from "nestjs-zod"
import { healthSchema } from "./health.model"

export class HealthDto extends createZodDto(healthSchema) {}
