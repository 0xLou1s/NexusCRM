import { QueryProvider } from "@/components/providers/query-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import type { ReactNode } from "react"

/**
 * Every context the app needs, composed once. The layout mounts this and
 * nothing else, so a new provider is added here rather than by nesting one more
 * wrapper into the tree.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  )
}
