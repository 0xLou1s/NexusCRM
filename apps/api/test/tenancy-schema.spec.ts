import {
  createDatabase,
  organizations,
  refreshTokens,
  users,
  type DatabaseConnection,
  type NewUser,
} from "@workspace/db"
import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
} from "vitest"
import { truncateAll } from "./harness"

// The schema is what is under test, so this talks to Postgres directly instead
// of booting Nest. Rejections go through the raw client because postgres.js
// surfaces the SQLSTATE on the error, which is the assertion worth making.
describe("tenancy schema", () => {
  let connection: DatabaseConnection

  beforeAll(() => {
    connection = createDatabase({ url: inject("databaseUrl"), max: 1 })
  })

  afterAll(async () => {
    await connection.close()
  })

  beforeEach(async () => {
    await truncateAll(connection)
  })

  async function seedOrg(name = "Acme"): Promise<string> {
    const id = randomUUID()
    await connection.db.insert(organizations).values({ id, name })
    return id
  }

  async function seedUser(
    orgId: string,
    overrides: Partial<NewUser> = {}
  ): Promise<string> {
    const id = randomUUID()
    await connection.db.insert(users).values({
      id,
      orgId,
      email: `${id}@example.com`,
      passwordHash: "argon2-hash",
      fullName: "Test User",
      ...overrides,
    })
    return id
  }

  it("defaults a new user to an active member", async () => {
    const orgId = await seedOrg()
    const userId = await seedUser(orgId)

    const rows = await connection.db
      .select()
      .from(users)
      .where(eq(users.id, userId))

    expect(rows).toEqual([
      expect.objectContaining({ role: "member", isActive: true }),
    ])
  })

  it("refuses the same email in a second organization", async () => {
    const first = await seedOrg("First")
    const second = await seedOrg("Second")
    await seedUser(first, { email: "owner@example.com" })

    await expect(
      connection.client`
        insert into users (org_id, email, password_hash, full_name)
        values (${second}, 'owner@example.com', 'argon2-hash', 'Impostor')
      `
    ).rejects.toMatchObject({ code: "23505" })
  })

  it("refuses a role outside the enum", async () => {
    const orgId = await seedOrg()

    await expect(
      connection.client`
        insert into users (org_id, email, password_hash, full_name, role)
        values (${orgId}, 'root@example.com', 'argon2-hash', 'Root', 'superuser')
      `
    ).rejects.toMatchObject({ code: "22P02" })
  })

  it("cascades a deleted organization through its users into their refresh tokens", async () => {
    const orgId = await seedOrg()
    const userId = await seedUser(orgId)
    await connection.db.insert(refreshTokens).values({
      userId,
      tokenHash: "sha256-hash",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    await connection.db.delete(organizations).where(eq(organizations.id, orgId))

    expect(await connection.db.select().from(users)).toHaveLength(0)
    expect(await connection.db.select().from(refreshTokens)).toHaveLength(0)
  })
})
