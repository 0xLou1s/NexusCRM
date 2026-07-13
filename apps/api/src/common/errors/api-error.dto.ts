import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { ERROR_KEY_VALUES } from "./error-keys"

const errorKeySchema = z.enum(ERROR_KEY_VALUES)

const errorParamsSchema = z.record(z.string(), z.unknown())

export const errorIssueSchema = z.object({
  // Dotted, so a form can match an issue to the input it names: "profile.phone".
  path: z.string(),
  code: errorKeySchema,
  message: z.string(),
  params: errorParamsSchema.optional(),
})

export type ErrorIssue = z.infer<typeof errorIssueSchema>

export const apiErrorSchema = z.object({
  code: errorKeySchema,
  // English, for logs and public API consumers. The UI renders t(code, params).
  message: z.string(),
  params: errorParamsSchema.optional(),
  issues: z.array(errorIssueSchema).optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

// The one shape every failure leaves the API in. Every status reuses it, so the
// frontend's generated `error` is this type rather than a union it must narrow.
export class ApiErrorDto extends createZodDto(apiErrorSchema) {}
