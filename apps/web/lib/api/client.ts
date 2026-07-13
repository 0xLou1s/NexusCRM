import { authMiddleware } from "@/lib/api/auth-middleware"
import { env } from "@/lib/env"
import type { paths } from "@workspace/api-types"
import createFetchClient from "openapi-fetch"
import createQueryClient from "openapi-react-query"

export const fetchClient = createFetchClient<paths>({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  // The session rides in an httpOnly cookie, which a cross-origin fetch drops
  // without this.
  credentials: "include",
})

fetchClient.use(authMiddleware)

export const fetchQueryClient = createQueryClient(fetchClient)
