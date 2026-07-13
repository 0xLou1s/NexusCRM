// Both tokens travel as httpOnly cookies, so JavaScript on the page cannot read
// them and an XSS cannot exfiltrate the session (spec §6).
export const ACCESS_TOKEN_COOKIE = "access_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token"

// Short-lived, because nothing revokes it: the access token is verified by its
// signature alone, never against the database.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

// Long-lived, but rotated on every use and revocable — that pair is what makes
// a week-long session safe (spec §6).
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
