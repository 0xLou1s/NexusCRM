import { SessionProvider } from "@/components/providers/session-provider"
import type { ReactNode } from "react"

export default function AppLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
