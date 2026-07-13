import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

// Every failure leaves the API in this shape (spec §7). It is registered as a
// Swagger response on every operation in openapi.ts, so the frontend's generated
// types describe errors as well as successes.
export class ApiErrorDto extends createZodDto(apiErrorSchema) {}
