import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { RedisContainer } from "@testcontainers/redis"
import { createDatabase } from "@workspace/db"
import { applyMigrations } from "@workspace/db/migrate"
import type { TestProject } from "vitest/node"

declare module "vitest" {
  interface ProvidedContext {
    databaseUrl: string
    redisUrl: string
  }
}

// A real Postgres, because unique constraints and cascade rules are exactly what
// a mock cannot fail. Redis comes with it: AppModule opens a BullMQ connection
// at boot, so without one the real module cannot be booted at all.
export default async function setup(project: TestProject) {
  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer("postgres:17-alpine").start(),
    new RedisContainer("redis:7-alpine").start(),
  ])

  const databaseUrl = postgres.getConnectionUri()
  const connection = createDatabase({ url: databaseUrl, max: 1 })

  try {
    await applyMigrations(connection.db)
  } finally {
    await connection.close()
  }

  project.provide("databaseUrl", databaseUrl)
  project.provide("redisUrl", redis.getConnectionUrl())

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()])
  }
}
