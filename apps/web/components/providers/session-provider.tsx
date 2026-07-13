"use client"

import { useSession } from "@/hooks/data/auth/use-session"
import { useSessionStore } from "@/lib/stores/session-store"
import { useEffect, type ReactNode } from "react"

// Mounted from the protected layout, never the root: the login page has no
// session by definition, and asking /auth/me there would 401 on every visit.
export function SessionProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const stored = useSessionStore((state) => state.session)
  const setSession = useSessionStore((state) => state.setSession)

  useEffect(() => {
    setSession(session)
  }, [session, setSession])

  // The store, not the query: an effect runs after its children render, so
  // gating on the query would paint the page one commit before the store those
  // children read has been filled.
  if (!stored) return null

  return children
}
