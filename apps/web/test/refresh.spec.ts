import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("refreshSession", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let refreshSession: () => Promise<boolean>

  beforeEach(async () => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    // openapi-fetch captures globalThis.fetch when the client is created, and
    // lib/api/refresh.ts creates one at import time — so the stub has to be in
    // place before the module loads. Resetting the registry also hands each test
    // a module whose in-flight promise is its own.
    vi.resetModules()
    ;({ refreshSession } = await import("@/lib/api/refresh"))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("collapses concurrent refreshes into one call", async () => {
    // Held open until every caller has arrived, so they overlap for certain
    // rather than by luck of the scheduler.
    let answer: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        answer = resolve
      })
    )

    const callers = [refreshSession(), refreshSession(), refreshSession()]
    answer(new Response(null, { status: 200 }))

    expect(await Promise.all(callers)).toEqual([true, true, true])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("refreshes again once the first one has settled", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))

    expect(await refreshSession()).toBe(true)
    expect(await refreshSession()).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reports a refusal rather than throwing", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "auth.invalidRefreshToken" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    )

    expect(await refreshSession()).toBe(false)
  })
})
