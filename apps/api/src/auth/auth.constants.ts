export const ACCESS_TOKEN_COOKIE = "access_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token"

// Nothing revokes an access token: it is verified by its signature alone, never
// against the database. Its lifetime is the whole revocation delay.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
