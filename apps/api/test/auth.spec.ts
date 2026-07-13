import { HttpStatus } from "@nestjs/common"
import { organizations, refreshTokens, users } from "@workspace/db"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestApp, truncateAll, type TestApp } from "./harness"

const OWNER = {
  organizationName: "Acme",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct-horse-battery",
}

describe("auth", () => {
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

  async function register(overrides: Partial<typeof OWNER> = {}) {
    return api()
      .post("/auth/register")
      .send({ ...OWNER, ...overrides })
      .expect(HttpStatus.CREATED)
  }

  describe("POST /auth/register", () => {
    it("creates the organization and its owner, and hands back a session", async () => {
      const response = await register()

      expect(response.body).toEqual({
        user: {
          id: expect.any(String),
          orgId: expect.any(String),
          email: OWNER.email,
          fullName: OWNER.fullName,
          role: "owner",
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        organization: {
          id: expect.any(String),
          name: OWNER.organizationName,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      })

      expect(response.body.user).not.toHaveProperty("passwordHash")
    })

    it("puts the session in httpOnly, SameSite=Lax cookies and nowhere else", async () => {
      const response = await register()

      const cookies = rawCookies(response)
      expect(cookies).toHaveLength(2)

      for (const cookie of cookies) {
        expect(cookie).toContain("HttpOnly")
        expect(cookie).toContain("SameSite=Lax")
      }

      expect(JSON.stringify(response.body)).not.toContain(
        cookiesOf(response).access_token
      )
    })

    it("refuses a second registration", async () => {
      await register()

      const response = await api()
        .post("/auth/register")
        .send({ ...OWNER, email: "second@example.com" })
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.code).toBe("auth.registrationClosed")
      expect(await countOf(organizations)).toBe(1)
    })

    it("creates one organization when two bootstraps race", async () => {
      const [first, second] = await Promise.all([
        api().post("/auth/register").send(OWNER),
        api()
          .post("/auth/register")
          .send({ ...OWNER, email: "second@example.com" }),
      ])

      expect([first.status, second.status].sort()).toEqual([
        HttpStatus.CREATED,
        HttpStatus.FORBIDDEN,
      ])
      expect(await countOf(organizations)).toBe(1)
      expect(await countOf(users)).toBe(1)
    })

    it("names the field a rejected password came from", async () => {
      const response = await api()
        .post("/auth/register")
        .send({ ...OWNER, password: "short" })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY)

      expect(response.body.issues).toEqual([
        {
          path: "password",
          code: "validation.tooSmall",
          message: expect.any(String),
          params: expect.objectContaining({ minimum: 8 }),
        },
      ])
    })
  })

  describe("POST /auth/login", () => {
    it("answers a wrong password and an unknown email identically", async () => {
      await register()

      const wrongPassword = await api()
        .post("/auth/login")
        .send({ email: OWNER.email, password: "not-the-password" })
        .expect(HttpStatus.UNAUTHORIZED)

      const unknownEmail = await api()
        .post("/auth/login")
        .send({ email: "nobody@example.com", password: OWNER.password })
        .expect(HttpStatus.UNAUTHORIZED)

      expect(wrongPassword.body).toEqual(unknownEmail.body)
      expect(wrongPassword.body.code).toBe("auth.invalidCredentials")
    })

    it("issues a session for the right password", async () => {
      await register()

      const response = await api()
        .post("/auth/login")
        .send({ email: OWNER.email, password: OWNER.password })
        .expect(HttpStatus.OK)

      expect(response.body.user.email).toBe(OWNER.email)
      expect(cookiesOf(response).access_token).toEqual(expect.any(String))
    })

    it("refuses a deactivated account", async () => {
      await register()
      await harness.connection.db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.email, OWNER.email))

      const response = await api()
        .post("/auth/login")
        .send({ email: OWNER.email, password: OWNER.password })
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.code).toBe("auth.accountDisabled")
    })
  })

  describe("POST /auth/refresh", () => {
    it("rotates the token: the old one is revoked, a new one is issued", async () => {
      const registered = await register()
      const first = cookiesOf(registered).refresh_token

      const response = await api()
        .post("/auth/refresh")
        .set("cookie", cookieHeader(registered))
        .expect(HttpStatus.OK)

      const second = cookiesOf(response).refresh_token

      expect(second).not.toBe(first)
      expect(response.body.user.email).toBe(OWNER.email)

      const stored = await harness.connection.db.select().from(refreshTokens)
      expect(stored).toHaveLength(2)
      expect(stored.filter((row) => row.revokedAt === null)).toHaveLength(1)
    })

    it("rejects a refresh with no cookie", async () => {
      const response = await api()
        .post("/auth/refresh")
        .expect(HttpStatus.UNAUTHORIZED)

      expect(response.body.code).toBe("auth.invalidRefreshToken")
    })

    it("revokes every session when a spent token is replayed", async () => {
      const registered = await register()
      const rotated = await api()
        .post("/auth/refresh")
        .set("cookie", cookieHeader(registered))
        .expect(HttpStatus.OK)

      const replayed = await api()
        .post("/auth/refresh")
        .set("cookie", cookieHeader(registered))
        .expect(HttpStatus.UNAUTHORIZED)

      expect(replayed.body.code).toBe("auth.refreshTokenReused")

      // The token the honest holder is carrying dies with the rest.
      const afterTheft = await api()
        .post("/auth/refresh")
        .set("cookie", cookieHeader(rotated))
        .expect(HttpStatus.UNAUTHORIZED)

      expect(afterTheft.body.code).toBe("auth.refreshTokenReused")

      const stored = await harness.connection.db.select().from(refreshTokens)
      expect(stored.every((row) => row.revokedAt !== null)).toBe(true)
    })

    it("clears the cookies of a session it has just ended", async () => {
      const response = await api()
        .post("/auth/refresh")
        .expect(HttpStatus.UNAUTHORIZED)

      for (const cookie of rawCookies(response)) {
        expect(cookie).toMatch(/^(access|refresh)_token=;/)
      }
    })
  })

  describe("POST /auth/logout", () => {
    it("revokes the refresh token server-side, not just in the browser", async () => {
      const registered = await register()

      await api()
        .post("/auth/logout")
        .set("cookie", cookieHeader(registered))
        .expect(HttpStatus.NO_CONTENT)

      const [stored] = await harness.connection.db.select().from(refreshTokens)
      expect(stored?.revokedAt).not.toBeNull()

      await api()
        .post("/auth/refresh")
        .set("cookie", cookieHeader(registered))
        .expect(HttpStatus.UNAUTHORIZED)
    })

    it("succeeds with no session at all", async () => {
      await api().post("/auth/logout").expect(HttpStatus.NO_CONTENT)
    })
  })

  describe("GET /auth/me", () => {
    it("returns the caller and their organization", async () => {
      const registered = await register()

      const response = await api()
        .get("/auth/me")
        .set("cookie", cookieHeader(registered))
        .expect(HttpStatus.OK)

      expect(response.body.user.email).toBe(OWNER.email)
      expect(response.body.user).not.toHaveProperty("passwordHash")
      expect(response.body.organization.name).toBe(OWNER.organizationName)
    })

    it("401s without a cookie", async () => {
      const response = await api()
        .get("/auth/me")
        .expect(HttpStatus.UNAUTHORIZED)

      expect(response.body.code).toBe("common.unauthenticated")
    })

    it("401s on a token this API did not sign", async () => {
      const forged = [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        "eyJzdWIiOiJub2JvZHkiLCJvcmdJZCI6Im5vbmUiLCJyb2xlIjoib3duZXIifQ",
        "not-a-signature",
      ].join(".")

      await api()
        .get("/auth/me")
        .set("cookie", `access_token=${forged}`)
        .expect(HttpStatus.UNAUTHORIZED)
    })
  })

  async function countOf(table: typeof organizations | typeof users) {
    const rows = await harness.connection.db.select().from(table)

    return rows.length
  }
})

function rawCookies(response: request.Response): string[] {
  const header: unknown = response.headers["set-cookie"]

  if (Array.isArray(header)) return header as string[]

  return typeof header === "string" ? [header] : []
}

function cookiesOf(response: request.Response): Record<string, string> {
  const pairs = rawCookies(response).map((cookie) => {
    const pair = cookie.split(";")[0] ?? ""
    const separator = pair.indexOf("=")

    return [pair.slice(0, separator), pair.slice(separator + 1)] as const
  })

  return Object.fromEntries(pairs)
}

// Supertest keeps no cookie jar, which is also what lets a test present a token
// the browser would already have thrown away.
function cookieHeader(response: request.Response): string {
  return Object.entries(cookiesOf(response))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}
