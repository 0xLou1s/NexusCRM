import { env } from "@/lib/env"
import type { paths } from "@workspace/api-types"
import createFetchClient from "openapi-fetch"
import createQueryClient from "openapi-react-query"

export const fetchClient = createFetchClient<paths>({
  baseUrl: env.apiUrl,
  // Session rides in an httpOnly cookie; cross-origin fetch drops it otherwise.
  credentials: "include",
})

export const fetchQueryClient = createQueryClient(fetchClient)
