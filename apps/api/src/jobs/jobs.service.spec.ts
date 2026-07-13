import { getQueueToken } from "@nestjs/bullmq"
import { Logger } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { jobSchemas, QUEUE_NAMES } from "@workspace/contracts"
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { JobsService } from "./jobs.service"

describe("JobsService", () => {
  let service: JobsService
  let add: Mock

  beforeEach(async () => {
    add = vi.fn().mockResolvedValue(undefined)
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getQueueToken(QUEUE_NAMES.zalo), useValue: { add } },
      ],
    }).compile()

    service = module.get<JobsService>(JobsService)
  })

  it("enqueues zalo.noop with a payload that satisfies the contract", async () => {
    await service.enqueueNoop()

    expect(add).toHaveBeenCalledTimes(1)
    const [name, payload] = add.mock.calls[0] as [string, unknown]
    expect(name).toBe("zalo.noop")
    expect(jobSchemas["zalo.noop"].parse(payload)).toEqual(payload)
  })

  it("resolves even when the queue is unreachable, so boot never blocks on Redis", async () => {
    const error = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {})
    add.mockRejectedValueOnce(new Error("connect ECONNREFUSED"))

    await expect(service.enqueueNoop()).resolves.toBeUndefined()

    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  // Boot fires the enqueue without awaiting it. If shutdown did not wait for it,
  // BullMQ would be left with a command rejecting against a closed connection
  // and nobody to catch it — an unhandled rejection on every fast restart.
  it("waits for an in-flight enqueue before the queue is torn down", async () => {
    let settle: () => void = () => {}
    add.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        settle = resolve
      })
    )

    service.onApplicationBootstrap()

    let destroyed = false
    const destroying = service.onModuleDestroy().then(() => {
      destroyed = true
    })

    await Promise.resolve()
    expect(destroyed).toBe(false)

    settle()
    await destroying
    expect(destroyed).toBe(true)
  })
})
