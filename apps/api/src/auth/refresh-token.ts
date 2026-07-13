import { createHash, randomBytes } from "node:crypto"

const TOKEN_BYTES = 32

export function generateRefreshToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

// SHA-256, not Argon2: the token is 256 CSPRNG bits, so there is no dictionary
// for a slow hash to defend against, and a salted hash could not be looked up in
// one indexed read.
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
