"use client"

import { fetchQueryClient } from "@/lib/api/client"
import type { paths } from "@workspace/api-types"

export type Health =
  paths["/health"]["get"]["responses"][200]["content"]["application/json"]

export function useHealth() {
  const { data, isPending, isError, error } = fetchQueryClient.useQuery(
    "get",
    "/health"
  )

  return {
    health: data,
    isLoading: isPending,
    isError,
    error,
  }
}
