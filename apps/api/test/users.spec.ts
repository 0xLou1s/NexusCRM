import { HttpStatus } from "@nestjs/common"
import {
  organizations,
  refreshTokens,
  teams,
  users,
  type UserRole,
} from "@workspace/db"
import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  cookieHeader,
  createTestApp,
  truncateAll,
  type TestApp,
} from "./harness"

const OWNER = {
  organizationName: "Acme",
  fullName: "Ada Lovelace",
  email: "owner@acme.example",
  password: "correct-horse-battery",
}

const PASSWORD = "another-horse-battery"

interface Actor {
  cookie: string
  userId: string
}

describe("users", () => {
  let harness: TestApp

  beforeAll(async () => {
    harness = await createTestApp()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await truncateAll(harness.connection)
  })

  function api() {
    return request(harness.app.getHttpServer())
  }

  async function registerOwner(): Promise<Actor & { orgId: string }> {
    const response = await api()
      .post("/auth/register")
      .send(OWNER)
      .expect(HttpStatus.CREATED)

    return {
      cookie: cookieHeader(response),
      userId: response.body.user.id as string,
      orgId: response.body.organization.id as string,
    }
  }

  function createUser(
    cookie: string,
    fields: { email: string; role?: UserRole; fullName?: string }
  ) {
    return api()
      .post("/users")
      .set("cookie", cookie)
      .send({ fullName: "Staffer", password: PASSWORD, ...fields })
  }

  async function login(email: string, password = PASSWORD): Promise<Actor> {
    const response = await api()
      .post("/auth/login")
      .send({ email, password })
      .expect(HttpStatus.OK)

    return {
      cookie: cookieHeader(response),
      userId: response.body.user.id as string,
    }
  }

  // Owner registration closes after the first organization, so a staff member of
  // a given role is created through the API and then signed in.
  async function seedActor(
    ownerCookie: string,
    role: UserRole,
    email: string
  ): Promise<Actor> {
    await createUser(ownerCookie, { email, role }).expect(HttpStatus.CREATED)

    return login(email)
  }

  async function seedTeam(orgId: string, name = "Sales"): Promise<string> {
    const rows = await harness.connection.db
      .insert(teams)
      .values({ orgId, name })
      .returning({ id: teams.id })

    return only(rows).id
  }

  async function seedForeignOrg(): Promise<string> {
    const rows = await harness.connection.db
      .insert(organizations)
      .values({ name: "Initech" })
      .returning({ id: organizations.id })

    return only(rows).id
  }

  describe("POST /users", () => {
    it("lets an owner create each role, and each new user can log in", async () => {
      const owner = await registerOwner()

      for (const role of ["owner", "admin", "member"] as const) {
        const email = `new-${role}@acme.example`
        const response = await createUser(owner.cookie, { email, role }).expect(
          HttpStatus.CREATED
        )

        expect(response.body).toMatchObject({ email, role, isActive: true })
        expect(response.body).not.toHaveProperty("passwordHash")

        const session = await login(email)
        expect(session.userId).toBe(response.body.id)
      }
    })

    it("lowercases the email so it matches at login", async () => {
      const owner = await registerOwner()

      const response = await createUser(owner.cookie, {
        email: "MixedCase@Acme.Example",
      }).expect(HttpStatus.CREATED)

      expect(response.body.email).toBe("mixedcase@acme.example")
    })

    it("refuses a duplicate email", async () => {
      const owner = await registerOwner()
      await createUser(owner.cookie, { email: "dup@acme.example" }).expect(
        HttpStatus.CREATED
      )

      const response = await createUser(owner.cookie, {
        email: "dup@acme.example",
      }).expect(HttpStatus.CONFLICT)

      expect(response.body.code).toBe("auth.emailAlreadyTaken")
    })

    it("lets an admin create a member but not an admin or an owner", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")

      await createUser(admin.cookie, { email: "m@acme.example" }).expect(
        HttpStatus.CREATED
      )

      for (const role of ["admin", "owner"] as const) {
        const response = await createUser(admin.cookie, {
          email: `${role}-by-admin@acme.example`,
          role,
        }).expect(HttpStatus.FORBIDDEN)

        expect(response.body.code).toBe("users.cannotAssignRole")
      }
    })

    it("forbids a member from creating staff", async () => {
      const owner = await registerOwner()
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      await createUser(member.cookie, { email: "x@acme.example" }).expect(
        HttpStatus.FORBIDDEN
      )
    })
  })

  describe("GET /users", () => {
    it("lists the staff in the organization, and a member may read it", async () => {
      const owner = await registerOwner()
      await seedActor(owner.cookie, "admin", "admin@acme.example")
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      const response = await api()
        .get("/users")
        .set("cookie", member.cookie)
        .expect(HttpStatus.OK)

      expect(response.body).toHaveLength(3)
      expect(
        response.body.map((u: { email: string }) => u.email).sort()
      ).toEqual(
        ["admin@acme.example", "member@acme.example", OWNER.email].sort()
      )
    })

    it("filters by role, team and active flag", async () => {
      const owner = await registerOwner()
      const teamId = await seedTeam(owner.orgId)

      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")
      const grouped = await seedActor(
        owner.cookie,
        "member",
        "grouped@acme.example"
      )
      const inactive = await seedActor(
        owner.cookie,
        "member",
        "inactive@acme.example"
      )

      await api()
        .patch(`/users/${grouped.userId}`)
        .set("cookie", owner.cookie)
        .send({ teamId })
        .expect(HttpStatus.OK)
      await api()
        .delete(`/users/${inactive.userId}`)
        .set("cookie", owner.cookie)
        .expect(HttpStatus.NO_CONTENT)

      const byRole = await api()
        .get("/users?role=admin")
        .set("cookie", owner.cookie)
        .expect(HttpStatus.OK)
      expect(byRole.body.map((u: { id: string }) => u.id)).toEqual([
        admin.userId,
      ])

      const byTeam = await api()
        .get(`/users?teamId=${teamId}`)
        .set("cookie", owner.cookie)
        .expect(HttpStatus.OK)
      expect(byTeam.body.map((u: { id: string }) => u.id)).toEqual([
        grouped.userId,
      ])

      const inactiveOnly = await api()
        .get("/users?isActive=false")
        .set("cookie", owner.cookie)
        .expect(HttpStatus.OK)
      expect(inactiveOnly.body.map((u: { id: string }) => u.id)).toEqual([
        inactive.userId,
      ])
    })
  })

  describe("PATCH /users/:id", () => {
    it("lets an owner rename, re-role and assign a team to a member", async () => {
      const owner = await registerOwner()
      const teamId = await seedTeam(owner.orgId)
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      const response = await api()
        .patch(`/users/${member.userId}`)
        .set("cookie", owner.cookie)
        .send({ fullName: "Renamed", role: "admin", teamId })
        .expect(HttpStatus.OK)

      expect(response.body).toMatchObject({
        fullName: "Renamed",
        role: "admin",
        teamId,
      })
    })

    it("refuses a team from another organization", async () => {
      const owner = await registerOwner()
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      const foreignTeam = await seedTeam(await seedForeignOrg(), "Their Team")

      const response = await api()
        .patch(`/users/${member.userId}`)
        .set("cookie", owner.cookie)
        .send({ teamId: foreignTeam })
        .expect(HttpStatus.NOT_FOUND)

      expect(response.body.code).toBe("users.teamNotFound")

      const rows = await harness.connection.db
        .select({ teamId: users.teamId })
        .from(users)
        .where(eq(users.id, member.userId))
      expect(only(rows).teamId).toBeNull()
    })

    it("refuses a team that does not exist", async () => {
      const owner = await registerOwner()
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      const response = await api()
        .patch(`/users/${member.userId}`)
        .set("cookie", owner.cookie)
        .send({ teamId: randomUUID() })
        .expect(HttpStatus.NOT_FOUND)

      expect(response.body.code).toBe("users.teamNotFound")
    })

    it("forbids an admin from touching the owner or another admin", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")
      const other = await seedActor(
        owner.cookie,
        "admin",
        "admin2@acme.example"
      )

      for (const targetId of [owner.userId, other.userId]) {
        const response = await api()
          .patch(`/users/${targetId}`)
          .set("cookie", admin.cookie)
          .send({ fullName: "Nope" })
          .expect(HttpStatus.FORBIDDEN)

        expect(response.body.code).toBe("users.cannotManageUser")
      }
    })

    it("forbids an admin from promoting a member above member", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      const response = await api()
        .patch(`/users/${member.userId}`)
        .set("cookie", admin.cookie)
        .send({ role: "admin" })
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.code).toBe("users.cannotAssignRole")
    })

    it("lets only an owner demote another owner", async () => {
      const owner = await registerOwner()
      const second = await seedActor(
        owner.cookie,
        "owner",
        "owner2@acme.example"
      )

      await api()
        .patch(`/users/${second.userId}`)
        .set("cookie", owner.cookie)
        .send({ role: "member" })
        .expect(HttpStatus.OK)
    })

    it("forbids changing one's own role", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")

      for (const actor of [owner, admin]) {
        const response = await api()
          .patch(`/users/${actor.userId}`)
          .set("cookie", actor.cookie)
          .send({ role: "member" })
          .expect(HttpStatus.FORBIDDEN)

        expect(response.body.code).toBe("users.cannotDemoteSelf")
      }
    })

    it("forbids deactivating oneself", async () => {
      const owner = await registerOwner()

      const response = await api()
        .patch(`/users/${owner.userId}`)
        .set("cookie", owner.cookie)
        .send({ isActive: false })
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.code).toBe("users.cannotDeactivateSelf")
    })

    it("revokes the target's sessions when deactivated through a patch", async () => {
      const owner = await registerOwner()
      await createUser(owner.cookie, { email: "member@acme.example" }).expect(
        HttpStatus.CREATED
      )
      const member = await login("member@acme.example")

      await api()
        .patch(`/users/${member.userId}`)
        .set("cookie", owner.cookie)
        .send({ isActive: false })
        .expect(HttpStatus.OK)

      await api()
        .post("/auth/refresh")
        .set("cookie", member.cookie)
        .expect(HttpStatus.UNAUTHORIZED)
    })

    it("404s for a user in another organization", async () => {
      const owner = await registerOwner()

      const foreignUsers = await harness.connection.db
        .insert(users)
        .values({
          orgId: await seedForeignOrg(),
          email: "peter@initech.example",
          passwordHash: "irrelevant",
          fullName: "Peter",
        })
        .returning({ id: users.id })

      await api()
        .patch(`/users/${only(foreignUsers).id}`)
        .set("cookie", owner.cookie)
        .send({ fullName: "Reached" })
        .expect(HttpStatus.NOT_FOUND)
    })
  })

  describe("POST /users/:id/reset-password", () => {
    it("replaces the password so the old one stops working", async () => {
      const owner = await registerOwner()
      const created = await createUser(owner.cookie, {
        email: "member@acme.example",
      }).expect(HttpStatus.CREATED)

      await api()
        .post(`/users/${created.body.id}/reset-password`)
        .set("cookie", owner.cookie)
        .send({ password: "brand-new-horse-battery" })
        .expect(HttpStatus.NO_CONTENT)

      await api()
        .post("/auth/login")
        .send({ email: "member@acme.example", password: PASSWORD })
        .expect(HttpStatus.UNAUTHORIZED)
      await api()
        .post("/auth/login")
        .send({
          email: "member@acme.example",
          password: "brand-new-horse-battery",
        })
        .expect(HttpStatus.OK)
    })

    it("forbids an admin from resetting the owner or another admin", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")
      const other = await seedActor(
        owner.cookie,
        "admin",
        "admin2@acme.example"
      )

      for (const targetId of [owner.userId, other.userId]) {
        await api()
          .post(`/users/${targetId}/reset-password`)
          .set("cookie", admin.cookie)
          .send({ password: "irrelevant-horse-battery" })
          .expect(HttpStatus.FORBIDDEN)
      }
    })
  })

  describe("DELETE /users/:id", () => {
    it("deactivates the user and revokes every session at once", async () => {
      const owner = await registerOwner()
      await createUser(owner.cookie, { email: "member@acme.example" }).expect(
        HttpStatus.CREATED
      )
      const member = await login("member@acme.example")

      await api()
        .delete(`/users/${member.userId}`)
        .set("cookie", owner.cookie)
        .expect(HttpStatus.NO_CONTENT)

      const rows = await harness.connection.db
        .select({ isActive: users.isActive })
        .from(users)
        .where(eq(users.id, member.userId))
      expect(only(rows).isActive).toBe(false)

      const tokens = await harness.connection.db
        .select({ revokedAt: refreshTokens.revokedAt })
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, member.userId))
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.every((t) => t.revokedAt !== null)).toBe(true)

      await api()
        .post("/auth/refresh")
        .set("cookie", member.cookie)
        .expect(HttpStatus.UNAUTHORIZED)
      await api()
        .post("/auth/login")
        .send({ email: "member@acme.example", password: PASSWORD })
        .expect(HttpStatus.FORBIDDEN)
    })

    it("forbids an admin from deleting the owner or another admin", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")
      const other = await seedActor(
        owner.cookie,
        "admin",
        "admin2@acme.example"
      )

      for (const targetId of [owner.userId, other.userId]) {
        await api()
          .delete(`/users/${targetId}`)
          .set("cookie", admin.cookie)
          .expect(HttpStatus.FORBIDDEN)
      }
    })

    it("lets an admin delete a member", async () => {
      const owner = await registerOwner()
      const admin = await seedActor(owner.cookie, "admin", "admin@acme.example")
      const member = await seedActor(
        owner.cookie,
        "member",
        "member@acme.example"
      )

      await api()
        .delete(`/users/${member.userId}`)
        .set("cookie", admin.cookie)
        .expect(HttpStatus.NO_CONTENT)
    })

    it("forbids deleting oneself", async () => {
      const owner = await registerOwner()

      const response = await api()
        .delete(`/users/${owner.userId}`)
        .set("cookie", owner.cookie)
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.code).toBe("users.cannotDeactivateSelf")
    })

    it("404s for a user that does not exist", async () => {
      const owner = await registerOwner()

      await api()
        .delete(`/users/${randomUUID()}`)
        .set("cookie", owner.cookie)
        .expect(HttpStatus.NOT_FOUND)
    })
  })
})

function only<T>(rows: T[]): T {
  const [row] = rows

  if (!row) throw new Error("Expected exactly one row")

  return row
}
