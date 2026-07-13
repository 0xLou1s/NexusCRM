import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { ERROR_KEY_VALUES } from "./error-keys"

const errorKeySchema = z.enum(ERROR_KEY_VALUES)

// Whatever the message needs interpolated: `{ minimum: 8 }` behind
// validation.tooSmall, `{ limit: 200 }` behind zalo.quotaExceeded. The
// constraint lives in the Zod schema and travels from there, so a translation
// never has to restate it — change min(8) to min(12) and the sentence follows.
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
  // The i18n key, and the only identifier: the frontend renders t(code, params).
  code: errorKeySchema,
  // English. Not for the UI — for logs, and for the public API consumers of
  // Phase 11, who have no dictionary to look a key up in.
  message: z.string(),
  params: errorParamsSchema.optional(),
  // Blamed on named inputs, so a form can print each one under the field that
  // caused it. A Zod rejection fills this, and so can a domain error: "this
  // email is taken" belongs under the email input, and the frontend should not
  // need a second code path to put it there.
  issues: z.array(errorIssueSchema).optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

// The one shape every failure leaves the API in (spec §7). Registered as a
// Swagger response on every operation in openapi.ts — and because every status
// reuses it, the frontend's generated `error` is this type rather than a union
// it has to narrow.
export class ApiErrorDto extends createZodDto(apiErrorSchema) {}
