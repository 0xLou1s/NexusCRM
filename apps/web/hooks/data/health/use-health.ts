"use client"

import { fetchQueryClient } from "@/lib/api/client"

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
