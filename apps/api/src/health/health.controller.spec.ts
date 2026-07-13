import { Test, TestingModule } from "@nestjs/testing"
import type { AppMeta } from "@workspace/db"
import { describe, expect, it, vi } from "vitest"
import { HealthController } from "./health.controller"
import { HealthService } from "./health.service"

const row: AppMeta = {
  id: 1,
  version: "0.1.0",
  updatedAt: new Date("2026-07-12T00:00:00.000Z"),
}

describe("HealthController", () => {
  it("reports the app_meta row the migrations seeded", async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { readAppMeta: vi.fn().mockResolvedValue(row) },
        },
      ],
    }).compile()

    await expect(module.get(HealthController).check()).resolves.toEqual({
      status: "ok",
      meta: row,
    })
  })
})
