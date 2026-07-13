import type { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { DatabaseConnection } from "@workspace/db"
import { AppModule } from "../src/app.module"
import { DATABASE_CONNECTION } from "../src/database/database.module"

export interface TestApp {
  app: INestApplication
  connection: DatabaseConnection
  close: () => Promise<void>
}

// Nothing is overridden: test/env.ts has already pointed DATABASE_URL and
// REDIS_URL at the containers, so this boots the real AppModule — global pipe,
// serializer and exception filter included — rather than a rearrangement of it.
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleRef.createNestApplication()
  await app.init()

  return {
    app,
    connection: app.get<DatabaseConnection>(DATABASE_CONNECTION),
    close: () => app.close(),
  }
}

// Drizzle keeps its migration bookkeeping in the `drizzle` schema, so emptying
// `public` leaves the schema itself intact and the container is migrated once,
// in global setup.
export async function truncateAll(
  connection: DatabaseConnection
): Promise<void> {
  const tables = await connection.client<{ name: string }[]>`
    select tablename as name from pg_tables where schemaname = 'public'
  `

  if (tables.length === 0) return

  const list = tables.map(({ name }) => `"public"."${name}"`).join(", ")
  await connection.client.unsafe(
    `truncate table ${list} restart identity cascade`
  )
}
