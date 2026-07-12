import { Test, TestingModule } from "@nestjs/testing"
import type { AppMeta, DatabaseConnection } from "@workspace/db"
import { DATABASE_CONNECTION } from "../database/database.module"
import { HealthService } from "./health.service"

const row: AppMeta = {
  id: 1,
  version: "0.1.0",
  updatedAt: new Date("2026-07-12T00:00:00.000Z"),
}

async function serviceReading(rows: AppMeta[]): Promise<HealthService> {
  const connection = {
    db: {
      select: () => ({ from: () => ({ limit: () => Promise.resolve(rows) }) }),
    },
  } as unknown as DatabaseConnection

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      HealthService,
      { provide: DATABASE_CONNECTION, useValue: connection },
    ],
  }).compile()

  return module.get(HealthService)
}

describe("HealthService", () => {
  it("returns the app_meta row", async () => {
    const service = await serviceReading([row])

    await expect(service.readAppMeta()).resolves.toEqual(row)
  })

  it("returns undefined when the table is empty", async () => {
    const service = await serviceReading([])

    await expect(service.readAppMeta()).resolves.toBeUndefined()
  })
})
