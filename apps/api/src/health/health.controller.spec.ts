import { ServiceUnavailableException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import type { AppMeta } from "@workspace/db"
import { HealthController } from "./health.controller"
import { HealthService } from "./health.service"

const row: AppMeta = {
  id: 1,
  version: "0.1.0",
  updatedAt: new Date("2026-07-12T00:00:00.000Z"),
}

async function controllerReading(
  meta: AppMeta | undefined
): Promise<HealthController> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: HealthService,
        useValue: { readAppMeta: jest.fn().mockResolvedValue(meta) },
      },
    ],
  }).compile()

  return module.get(HealthController)
}

describe("HealthController", () => {
  it("reports the app_meta row the migrations seeded", async () => {
    const controller = await controllerReading(row)

    await expect(controller.check()).resolves.toEqual({
      status: "ok",
      meta: row,
    })
  })

  // An empty app_meta means the schema this build expects was never applied.
  // Answering 200 there would report a database the API cannot actually use.
  it("is unavailable when app_meta is empty", async () => {
    const controller = await controllerReading(undefined)

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException
    )
  })
})
