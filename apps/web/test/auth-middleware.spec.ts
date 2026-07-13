import { authMiddleware } from "@/lib/api/auth-middleware"
import { endSession, refreshSession } from "@/lib/api/refresh"
import type { paths } from "@workspace/api-types"
import createFetchClient, { type MiddlewareCallbackParams } from "openapi-fetch"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api/refresh", () => ({
  refreshSession: vi.fn(),
  endSession: vi.fn(),
}))

const refreshSessionMock = vi.mocked(refreshSession)
const endSessionMock = vi.mocked(endSession)

const SESSION = {
  user: { id: "u1", email: "ada@example.com" },
  organization: { id: "o1", name: "Acme" },
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("authMiddleware", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  function client() {
    const created = createFetchClient<paths>({
      baseUrl: "http://api.test",
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })
    created.use(authMiddleware)

    return created
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
  })

  it("refreshes and replays the request the 401 came from", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ code: "common.unauthenticated" }, 401))
      .mockResolvedValueOnce(json(SESSION, 200))
    refreshSessionMock.mockResolvedValue(true)

    const { data, error } = await client().GET("/auth/me")

    expect(error).toBeUndefined()
    expect(data).toMatchObject({ user: { email: "ada@example.com" } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refreshSessionMock).toHaveBeenCalledTimes(1)
  })

  it("ends the session when the refresh is refused", async () => {
    fetchMock.mockResolvedValue(json({ code: "common.unauthenticated" }, 401))
    refreshSessionMock.mockResolvedValue(false)

    const { error } = await client().GET("/auth/me")

    expect(error).toMatchObject({ code: "common.unauthenticated" })
    expect(endSessionMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("leaves a wrong password alone: a 401 from a @Public() route is not an expired token", async () => {
    fetchMock.mockResolvedValue(json({ code: "auth.invalidCredentials" }, 401))

    const { error } = await client().POST("/auth/login", {
      body: { email: "ada@example.com", password: "wrong" },
    })

    expect(error).toMatchObject({ code: "auth.invalidCredentials" })
    expect(refreshSessionMock).not.toHaveBeenCalled()
    expect(endSessionMock).not.toHaveBeenCalled()
  })

  // Driven through the middleware directly: no endpoint that takes a body sits
  // behind the guard yet to prove this through the client.
  it("replays a request body that the first attempt already consumed", async () => {
    refreshSessionMock.mockResolvedValue(true)
    fetchMock.mockResolvedValue(json({ ok: true }, 200))

    const request = new Request("http://api.test/things", {
      method: "POST",
      body: JSON.stringify({ name: "Ada" }),
      headers: { "content-type": "application/json" },
    })

    const params = {
      request,
      id: "1",
      schemaPath: "/things",
      params: {},
      options: { fetch: fetchMock },
    } as unknown as MiddlewareCallbackParams

    authMiddleware.onRequest(params)

    // What fetch() does to a request it sends: the body is disturbed, and
    // reading it a second time throws.
    await request.text()

    await authMiddleware.onResponse({
      ...params,
      response: json({ code: "common.unauthenticated" }, 401),
    })

    const replayed = fetchMock.mock.calls.at(-1)?.[0] as Request
    expect(await replayed.json()).toEqual({ name: "Ada" })
  })
})
