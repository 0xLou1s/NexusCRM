import { env } from "@/lib/env"
import type { paths } from "@workspace/api-types"
import createFetchClient from "openapi-fetch"
import createQueryClient from "openapi-react-query"

/**
 * The only way the frontend talks to the API.
 *
 * `paths` is generated from the backend's OpenAPI document, so calling an
 * endpoint that does not exist, or reading a field the response does not carry,
 * is a compile error rather than a runtime surprise.
 */
export const fetchClient = createFetchClient<paths>({
  baseUrl: env.apiUrl,
  // The session lives in httpOnly cookies (spec §6), and a cross-origin fetch
  // drops cookies unless it is told not to.
  credentials: "include",
})

/**
 * The same client, as TanStack Query hooks:
 * `fetchQueryClient.useQuery("get", "/health")`.
 *
 * Components never call this directly — an endpoint gets a hook of its own
 * under `features/<feature>/api`, which is where its query key, invalidation
 * and error handling live.
 */
export const fetchQueryClient = createQueryClient(fetchClient)
