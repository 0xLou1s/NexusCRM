import type { CookieOptions, Response } from "express"
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./auth.constants"

/**
 * SameSite=Lax, never None (spec §6, Phase 1 risks).
 *
 * In development the web app is on :3000 and the API on :3001 — a different
 * origin, but the same site, so Lax cookies are sent. In production both sit
 * behind one domain. If a deployment ever needs `None` to work, the deployment
 * is wrong, not this.
 */
function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure, path: "/" }
}

export function setSessionCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
  secure: boolean
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...cookieOptions(secure),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  })

  response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...cookieOptions(secure),
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  })
}

// The attributes have to match the ones the cookie was set with, or the browser
// keeps the old cookie alongside the expired one.
export function clearSessionCookies(response: Response, secure: boolean): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions(secure))
  response.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions(secure))
}
