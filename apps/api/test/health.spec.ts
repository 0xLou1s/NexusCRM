import { HttpStatus } from "@nestjs/common"
import { appMeta } from "@workspace/db"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestApp, truncateAll, type TestApp } from "./harness"

describe("GET /health", () => {
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

  it("reports the app_meta row", async () => {
    await harness.connection.db
      .insert(appMeta)
      .values({ id: 1, version: "0.1.0" })

    const response = await request(harness.app.getHttpServer())
      .get("/health")
      .expect(HttpStatus.OK)

    expect(response.body).toEqual({
      status: "ok",
      // A Date in the row, an ISO string on the wire — the codec in
      // src/common/timestamp.ts, exercised against a real timestamptz column.
      meta: { id: 1, version: "0.1.0", updatedAt: expect.any(String) },
    })
  })

  // Reaching this at all proves the whole error contract: a service threw a
  // DomainError, the filter mapped its kind onto a status, and the body came
  // back in the one shape the frontend has a generated type for.
  it("answers an empty app_meta in the one error shape", async () => {
    const response = await request(harness.app.getHttpServer())
      .get("/health")
      .expect(HttpStatus.SERVICE_UNAVAILABLE)

    expect(response.body).toEqual({
      code: "APP_META_MISSING",
      message: expect.any(String),
    })
  })
})
