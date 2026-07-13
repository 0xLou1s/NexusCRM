import { Test, TestingModule } from "@nestjs/testing"
import type { AppMeta, DatabaseConnection } from "@workspace/db"
import { describe, expect, it } from "vitest"
import { DATABASE_CONNECTION } from "../database/database.module"
import { AppMetaMissingError } from "./health.errors"
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

  // An empty app_meta means the schema this build expects was never applied.
  // The service names that failure and stops there: nothing here knows it is a
  // 503, which is what lets the same service run outside a request (spec §7).
  it("raises a domain error when the table is empty", async () => {
    const service = await serviceReading([])

    await expect(service.readAppMeta()).rejects.toThrow(AppMetaMissingError)
  })
})
