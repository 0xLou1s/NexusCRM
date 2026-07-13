import type { INestApplication, Type } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { DatabaseConnection } from "@workspace/db"
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DATABASE_CONNECTION } from "../src/database/database.module"

export interface TestApp {
  app: INestApplication
  connection: DatabaseConnection
  close: () => Promise<void>
}

// Nothing is overridden: test/env.ts has already pointed DATABASE_URL and
// REDIS_URL at the containers, so this boots the real AppModule rather than a
// rearrangement of it. `controllers` mounts probe routes alongside it, for the
// global pipe, filter and guards, which only have behaviour to test on a route.
export async function createTestApp(
  controllers: Type[] = []
): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers,
  }).compile()

  const app = moduleRef.createNestApplication()
  configureApp(app)
  await app.init()

  return {
    app,
    connection: app.get<DatabaseConnection>(DATABASE_CONNECTION),
    close: () => app.close(),
  }
}

// Only `public`: Drizzle keeps its migration bookkeeping in the `drizzle`
// schema, so the container stays migrated from global setup.
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
