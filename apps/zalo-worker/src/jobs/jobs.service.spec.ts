import { Logger } from "@nestjs/common"
import type { Job } from "bullmq"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"
import { JobsService } from "./jobs.service"

const asJob = (name: string, data: unknown) => ({ name, data }) as Job

describe("JobsService", () => {
  let service: JobsService

  beforeEach(() => {
    service = new JobsService()
  })

  it("consumes zalo.noop and logs the parsed payload", async () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {})

    await service.process(
      asJob("zalo.noop", { enqueuedAt: "2026-07-12T00:00:00.000Z" })
    )

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("2026-07-12T00:00:00.000Z")
    )
    log.mockRestore()
  })

  it("rejects a malformed payload so BullMQ marks the job failed", async () => {
    await expect(service.process(asJob("zalo.noop", {}))).rejects.toThrow(
      ZodError
    )
  })

  it("rejects a job name that is not in the contract", async () => {
    await expect(service.process(asJob("zalo.mystery", {}))).rejects.toThrow(
      /zalo\.mystery/
    )
  })
})
