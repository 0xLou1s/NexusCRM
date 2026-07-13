import { z } from "zod"

/**
 * Environment schema. Every variable the app consumes is declared here;
 * validation runs once at bootstrap and the process refuses to start on an
 * invalid or missing value. Add new variables here as they are consumed.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  // Signs the access token (spec §6). No default: a fallback secret is a
  // forgeable session, and the one thing worse than failing to boot is booting
  // with an authentication system anyone can sign for.
  JWT_SECRET: z.string().min(32),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
