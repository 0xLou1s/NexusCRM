"use client"

import { sessionQueryOptions } from "@/hooks/data/auth/use-session"
import { fetchQueryClient } from "@/lib/api/client"
import { useQueryClient } from "@tanstack/react-query"

export interface Credentials {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  const { mutateAsync, isPending } = fetchQueryClient.useMutation(
    "post",
    "/auth/login",
    {
      onSuccess: (session) => {
        // Login answers with the same object /auth/me does, so seeding closes
        // the window where the browser has a cookie and the store has no user.
        queryClient.setQueryData(sessionQueryOptions.queryKey, session)
      },
    }
  )

  return {
    login: (body: Credentials) => mutateAsync({ body }),
    isPending,
  }
}
