import { createHash, randomBytes } from "node:crypto"

const TOKEN_BYTES = 32

/**
 * The refresh token is opaque, not a JWT: it is looked up in `refresh_tokens`
 * on every use, which is what lets rotation revoke it. A JWT would be valid
 * until it expired, whatever the database said.
 */
export function generateRefreshToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

/**
 * SHA-256, not Argon2, and deliberately: the token is 256 bits from a CSPRNG, so
 * there is no dictionary to attack and nothing for a slow hash to defend
 * against. What the column does need is to be looked up in one indexed read on
 * every refresh, which a salted hash cannot be.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
