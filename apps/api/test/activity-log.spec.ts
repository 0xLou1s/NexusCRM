import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Patch,
  Post,
} from "@nestjs/common"
import { activityLogs, type ActivityLog } from "@workspace/db"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { LogActivity } from "../src/activity/log-activity.decorator"
import { ConflictError } from "../src/common/errors/common.errors"
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

const CONTACT_ID = "2f1c8f8e-27a1-4e57-9a5d-0f4b0f9f6b21"

// The interceptor is global, but only a route gives it something to record, and
// Phase 1 ships no mutating endpoint behind the guard. These stand in for the
// ones Phase 4 brings, and are named `contacts` because that is the vocabulary
// the derived action is supposed to produce.
@Controller("contacts")
class ContactsProbeController {
  @Post()
  create() {
    return { id: CONTACT_ID }
  }

  @Patch(":id")
  update() {
    return { updated: true }
  }

  @Delete(":id")
  remove() {
    return { deleted: true }
  }

  @Post(":id/assign")
  @LogActivity("contact.assign")
  assign() {
    return { assigned: true }
  }

  @Post("refuse")
  refuse(): never {
    throw new ConflictError("This one does not happen")
  }

  @Get()
  list() {
    return []
  }
}

describe("activity log", () => {
  let harness: TestApp

  beforeAll(async () => {
    harness = await createTestApp([ContactsProbeController])
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

  function logged(): Promise<ActivityLog[]> {
    return harness.connection.db.select().from(activityLogs)
  }

  it("records a mutation against the actor and organization the token names", async () => {
    const owner = await registerOwner()

    await api()
      .post("/contacts")
      .set("cookie", owner.cookie)
      .send({ fullName: "Grace" })
      .expect(HttpStatus.CREATED)

    expect(await logged()).toEqual([
      expect.objectContaining({
        orgId: owner.orgId,
        userId: owner.userId,
        action: "contact.create",
        entityType: "contact",
        entityId: null,
        details: {},
      }),
    ])
  })

  it("names the entity from the route and takes its id from the path", async () => {
    const owner = await registerOwner()

    await api()
      .patch(`/contacts/${CONTACT_ID}`)
      .set("cookie", owner.cookie)
      .send({ fullName: "Grace Hopper" })
      .expect(HttpStatus.OK)

    await api()
      .delete(`/contacts/${CONTACT_ID}`)
      .set("cookie", owner.cookie)
      .expect(HttpStatus.OK)

    expect(await logged()).toEqual([
      expect.objectContaining({
        action: "contact.update",
        entityId: CONTACT_ID,
      }),
      expect.objectContaining({
        action: "contact.delete",
        entityId: CONTACT_ID,
      }),
    ])
  })

  it("lets @LogActivity name an action the URL would have lied about", async () => {
    const owner = await registerOwner()

    await api()
      .post(`/contacts/${CONTACT_ID}/assign`)
      .set("cookie", owner.cookie)
      .expect(HttpStatus.CREATED)

    const [entry] = await logged()

    // Derived from the path, this would have been `contact.create`.
    expect(entry?.action).toBe("contact.assign")
    expect(entry?.entityId).toBe(CONTACT_ID)
  })

  it("records nothing for a read", async () => {
    const owner = await registerOwner()

    await api()
      .get("/contacts")
      .set("cookie", owner.cookie)
      .expect(HttpStatus.OK)

    expect(await logged()).toEqual([])
  })

  it("records nothing for a mutation that failed", async () => {
    const owner = await registerOwner()

    await api()
      .post("/contacts/refuse")
      .set("cookie", owner.cookie)
      .expect(HttpStatus.CONFLICT)

    expect(await logged()).toEqual([])
  })

  // The interceptor never reads `request.body`, so there is no redaction list to
  // forget to add a field to.
  it("never writes the request body, whatever the request body was", async () => {
    const owner = await registerOwner()

    await api()
      .post("/contacts")
      .set("cookie", owner.cookie)
      .send({ fullName: "Grace", secret: "hunter2" })
      .expect(HttpStatus.CREATED)

    const rows = await logged()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.details).toEqual({})
    expect(JSON.stringify(rows)).not.toContain("hunter2")
  })

  // The one the plan asks for by name. Signing in is @Public(): it carries no
  // token, so there is no actor or organization to attribute an action to, and
  // the interceptor passes it through untouched — password and all.
  it("writes nothing at all when a password crosses the wire", async () => {
    await registerOwner()

    await api()
      .post("/auth/login")
      .send({ email: OWNER.email, password: OWNER.password })
      .expect(HttpStatus.OK)

    await api()
      .post("/auth/login")
      .send({ email: OWNER.email, password: "wrong-password-entirely" })
      .expect(HttpStatus.UNAUTHORIZED)

    const rows = await logged()

    expect(rows).toEqual([])
    expect(JSON.stringify(rows)).not.toContain(OWNER.password)
  })
})
