import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"
import { AppModule } from "./../src/app.module"

/**
 * Runs against the real database behind `DATABASE_URL`: it asserts that the
 * migration seeded `app_meta`, which no mock can tell you. It is therefore not
 * part of `pnpm test` — run it with `pnpm --filter api test:e2e`. PR 0.8
 * replaces the live database here with a Testcontainers one.
 */
describe("GET /health (e2e)", () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("reports the seeded app_meta row", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200)

    expect(response.body).toEqual({
      status: "ok",
      meta: {
        id: expect.any(Number),
        version: expect.any(String),
        updatedAt: expect.any(String),
      },
    })
  })
})
