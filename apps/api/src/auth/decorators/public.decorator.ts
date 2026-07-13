import { applyDecorators, SetMetadata } from "@nestjs/common"
import { ApiExtension } from "@nestjs/swagger"

export const IS_PUBLIC_KEY = "auth:isPublic"

// The same opt-out written a second time, into the OpenAPI operation: openapi.ts
// reads it back to decide which operations document a 401. Without it, every
// guarded handler would have to remember to declare one.
export const PUBLIC_OPERATION_EXTENSION = "x-public"

export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    ApiExtension(PUBLIC_OPERATION_EXTENSION, true)
  )
