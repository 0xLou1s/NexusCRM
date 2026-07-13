import {
  LOGIN_PATH,
  NEXT_PARAM,
  SESSION_COOKIE,
  safeNextPath,
} from "@/lib/auth"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Presence, not validity, and so this authorizes nothing: it cannot verify the
 * cookie's signature, because a secret this app could verify with is one it
 * could also forge with. The API stays the only thing deciding what a request is
 * allowed to do. All this decides is which page to render, so a signed-out
 * visitor meets the login form rather than a dashboard that 401s a moment later.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname, search, searchParams, origin } = request.nextUrl
  const isLogin = pathname === LOGIN_PATH

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.search = ""
    url.searchParams.set(NEXT_PARAM, `${pathname}${search}`)

    return NextResponse.redirect(url)
  }

  // The login form never reads `next`: it signs in and refreshes, and the
  // session it has just been given brings it back through here.
  if (hasSession && isLogin) {
    const next = safeNextPath(searchParams.get(NEXT_PARAM) ?? undefined)

    return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
