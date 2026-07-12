/**
 * The API the browser talks to.
 *
 * `next.config.ts` maps the repository-root `API_URL` onto this public name, so
 * the URL the frontend calls and the URL `pnpm gen:api-types` reads its types
 * from can never disagree.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL

if (!apiUrl) {
  throw new Error(
    "API_URL is not set. Copy .env.example to .env at the repository root."
  )
}

export const env = {
  apiUrl,
} as const
