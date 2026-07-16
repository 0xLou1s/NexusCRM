import { Controller, Get, HttpStatus } from "@nestjs/common"
import { hash } from "@node-rs/argon2"
import { users, type UserRole } from "@workspace/db"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { AuthenticatedUser } from "../src/auth/auth.types"
import { CurrentUser } from "../src/auth/decorators/current-user.decorator"
import { OrgId } from "../src/auth/decorators/org-id.decorator"
import { Public } from "../src/auth/decorators/public.decorator"
import { Roles } from "../src/auth/decorators/roles.decorator"
import {
  cookieHeader,
  createTestApp,
  truncateAll,
  type TestApp,
} from "./harness"

const OWNER = {
  organizationName: "Acme",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct-horse-battery",
}

const MEMBER_PASSWORD = "member-horse-battery"

// Guards only exist on a route, so the routes come with the test: nothing in the
// application yet uses @Roles(), and waiting for Phase 2 to test it would ship it
// unproven.
@Controller("__guards")
class GuardsProbeController {
  @Get("open")
  @Public()
  open() {
    return { reached: true }
  }

  @Get("session")
  session(@CurrentUser() user: AuthenticatedUser, @OrgId() orgId: string) {
    return { userId: user.id, role: user.role, orgId }
  }

  @Get("admin-only")
  @Roles("owner", "admin")
  adminOnly() {
    return { reached: true }
  }
}

describe("guards", () => {
  let harness: TestApp

  beforeAll(async () => {
    harness = await createTestApp([GuardsProbeController])
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

  async function registerOwner() {
    const response = await api()
      .post("/auth/register")
      .send(OWNER)
      .expect(HttpStatus.CREATED)

    return {
      cookie: cookieHeader(response),
      orgId: response.body.organization.id as string,
      userId: response.body.user.id as string,
    }
  }

  // The API has no endpoint that creates a user until Phase 2, so the row goes in
  // directly and then logs in through the real endpoint.
  async function loginAs(orgId: string, role: UserRole) {
    const email = `${role}@example.com`

    await harness.connection.db.insert(users).values({
      orgId,
      email,
      passwordHash: await hash(MEMBER_PASSWORD),
      fullName: `A ${role}`,
      role,
    })

    const response = await api()
      .post("/auth/login")
      .send({ email, password: MEMBER_PASSWORD })
      .expect(HttpStatus.OK)

    return cookieHeader(response)
  }

  describe("JwtAuthGuard", () => {
    it("401s a guarded route with no cookie, without the route being asked to", async () => {
      const response = await api()
        .get("/__guards/session")
        .expect(HttpStatus.UNAUTHORIZED)

      expect(response.body.code).toBe("common.unauthenticated")
    })

    // /health is @Public() too, and test/health.spec.ts answers it without a
    // cookie — which is the same proof, on the route that actually needs it.
    it("lets a @Public() route answer with no cookie", async () => {
      const response = await api().get("/__guards/open").expect(HttpStatus.OK)

      expect(response.body).toEqual({ reached: true })
    })
  })

  describe("@CurrentUser() and @OrgId()", () => {
    it("hand the handler the user and the organization the token names", async () => {
      const owner = await registerOwner()

      const response = await api()
        .get("/__guards/session")
        .set("cookie", owner.cookie)
        .expect(HttpStatus.OK)

      expect(response.body).toEqual({
        userId: owner.userId,
        orgId: owner.orgId,
        role: "owner",
      })
    })
  })

  describe("RolesGuard", () => {
    it("403s a member on an @Roles('owner', 'admin') route", async () => {
      const owner = await registerOwner()
      const member = await loginAs(owner.orgId, "member")

      const response = await api()
        .get("/__guards/admin-only")
        .set("cookie", member)
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.code).toBe("common.forbidden")
    })

    it("lets an admin and an owner through", async () => {
      const owner = await registerOwner()
      const admin = await loginAs(owner.orgId, "admin")

      await api()
        .get("/__guards/admin-only")
        .set("cookie", admin)
        .expect(HttpStatus.OK)

      await api()
        .get("/__guards/admin-only")
        .set("cookie", owner.cookie)
        .expect(HttpStatus.OK)
    })

    it("401s before it 403s: a role cannot be checked without a token", async () => {
      const response = await api()
        .get("/__guards/admin-only")
        .expect(HttpStatus.UNAUTHORIZED)

      expect(response.body.code).toBe("common.unauthenticated")
    })
  })
})
