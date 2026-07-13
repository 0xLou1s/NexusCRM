import {
  createDatabase,
  organizations,
  users,
  type DatabaseConnection,
} from "@workspace/db"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { OrgScopedRepository } from "../src/common/database/org-scoped.repository"
import { truncateAll } from "./harness"

class UserRepository extends OrgScopedRepository<typeof users> {
  constructor(connection: DatabaseConnection) {
    super(connection, users)
  }
}

const ADA = {
  email: "ada@acme.example",
  passwordHash: "irrelevant",
  fullName: "Ada Lovelace",
}

describe("OrgScopedRepository", () => {
  let connection: DatabaseConnection
  let repository: UserRepository

  let acme: string
  let initech: string
  // Belongs to Initech, and every assertion below is about Acme failing to reach
  // it.
  let theirUser: string

  beforeAll(() => {
    connection = createDatabase({ url: process.env.DATABASE_URL ?? "" })
    repository = new UserRepository(connection)
  })

  afterAll(async () => {
    await connection.close()
  })

  beforeEach(async () => {
    await truncateAll(connection)

    const orgs = await connection.db
      .insert(organizations)
      .values([{ name: "Acme" }, { name: "Initech" }])
      .returning({ id: organizations.id })

    acme = at(orgs, 0).id
    initech = at(orgs, 1).id

    const inserted = await connection.db
      .insert(users)
      .values({
        orgId: initech,
        email: "peter@initech.example",
        passwordHash: "irrelevant",
        fullName: "Peter Gibbons",
      })
      .returning({ id: users.id })

    theirUser = at(inserted, 0).id
  })

  it("stamps a new row with the organization it was given, not one from the input", async () => {
    const created = await repository.insert(acme, ADA)

    expect(created.orgId).toBe(acme)
  })

  it("does not read another organization's row by id", async () => {
    expect(await repository.findById(acme, theirUser)).toBeUndefined()
    expect(await repository.findById(initech, theirUser)).toMatchObject({
      id: theirUser,
    })
  })

  it("lists only the organization it was given", async () => {
    await repository.insert(acme, ADA)

    const rows = await repository.findMany(acme)

    expect(rows.map((row) => row.email)).toEqual([ADA.email])
  })

  it("does not update another organization's row", async () => {
    const updated = await repository.update(acme, theirUser, {
      fullName: "Renamed by Acme",
    })

    expect(updated).toBeUndefined()

    const [row] = await connection.db
      .select()
      .from(users)
      .where(eq(users.id, theirUser))

    expect(row?.fullName).toBe("Peter Gibbons")
  })

  it("does not delete another organization's row", async () => {
    expect(await repository.deleteById(acme, theirUser)).toBe(false)
    expect(await repository.findById(initech, theirUser)).toBeDefined()
  })

  it("cannot be called without an organization", () => {
    // The assertion that matters runs in `pnpm typecheck`, not here: the moment
    // omitting orgId compiles, this suppression is unused and the build fails.
    // That is the whole point of the base class (spec §4).
    // @ts-expect-error every repository method takes orgId as its first argument
    const unscoped = () => repository.findById(theirUser)

    expect(unscoped).toBeTypeOf("function")
  })
})

function at<T>(rows: T[], index: number): T {
  const row = rows[index]

  if (!row) throw new Error(`The insert returned no row at ${index}`)

  return row
}
