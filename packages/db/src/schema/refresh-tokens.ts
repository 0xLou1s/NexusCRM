import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users.js"

// Hashes only — a database leak must not hand out live sessions. `revoked_at` is
// what makes logout and refresh-token rotation actually revoke, instead of
// waiting for the token to expire on its own (spec §6).
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Every refresh presents a token and nothing else, so the hash is the only
    // way in.
    index("refresh_tokens_token_hash_idx").on(table.tokenHash),
    // Reuse detection revokes every token a user holds in one statement.
    index("refresh_tokens_user_id_idx").on(table.userId),
  ]
)

export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
