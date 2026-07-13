import type { MessagesFor } from "@/lib/i18n/types"

export const HEALTH_MESSAGES: MessagesFor<"health"> = {
  "health.appMetaMissing": {
    title: "Database not migrated",
    description: "The database is reachable but has no schema yet.",
  },
}
