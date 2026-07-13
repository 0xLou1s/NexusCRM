"use client"

import { fetchQueryClient } from "@/lib/api/client"
import { LOGIN_PATH } from "@/lib/auth"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { mutate, isPending } = fetchQueryClient.useMutation(
    "post",
    "/auth/logout",
    {
      // Settled, not success: a browser that could not reach the endpoint is
      // done with the session either way.
      onSettled: () => {
        queryClient.clear()
        router.replace(LOGIN_PATH)
        // proxy.ts decides on the cookie, and the cached route tree was rendered
        // while one still existed.
        router.refresh()
      },
    }
  )

  return { logout: () => mutate({}), isPending }
}
