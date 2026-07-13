import type { CookieOptions, Response } from "express"
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./auth.constants"

// A deployment that needs SameSite=None is a deployment serving the web app from
// another site, which this one never does.
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

// The attributes must match the ones the cookie was set with, or the browser
// keeps the live cookie alongside the expired one.
export function clearSessionCookies(response: Response, secure: boolean): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions(secure))
  response.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions(secure))
}
