export const LOGIN_PATH = "/login"
export const HOME_PATH = "/"
export const NEXT_PARAM = "next"

// Not the access token: that cookie expires after 15 minutes, and a tab left
// open for twenty still has a live session — the next request silently refreshes
// it.
export const SESSION_COOKIE = "refresh_token"

// "//evil.example" is protocol-relative, which a naive "starts with /" check
// waves through as an open redirect.
export function safeNextPath(next: string | undefined): string {
  if (!next?.startsWith("/") || next.startsWith("//")) return HOME_PATH

  return next
}
