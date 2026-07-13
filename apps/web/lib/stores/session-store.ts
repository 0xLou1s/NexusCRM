import type { components } from "@workspace/api-types"
import { create } from "zustand"

export type Session = components["schemas"]["SessionDto_Output"]

interface SessionState {
  session: Session | undefined
  setSession: (session: Session | undefined) => void
  clearSession: () => void
}

// GET /auth/me stays the source of truth; SessionProvider keeps this fed from
// it. What the store buys is a reader outside React — the fetch middleware runs
// in no tree, and a session whose refresh just failed has to be dropped.
export const useSessionStore = create<SessionState>()((set) => ({
  session: undefined,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: undefined }),
}))

// Non-optional because SessionProvider does not render its children until the
// session is there, so a consumer below it never has to narrow it.
export function useCurrentSession(): Session {
  const session = useSessionStore((state) => state.session)

  if (!session) {
    throw new Error(
      "useCurrentSession is only available inside SessionProvider"
    )
  }

  return session
}
