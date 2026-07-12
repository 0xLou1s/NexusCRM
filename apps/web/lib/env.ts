const apiUrl = process.env.NEXT_PUBLIC_API_URL

if (!apiUrl) {
  throw new Error(
    "API_URL is not set. Copy .env.example to .env at the repository root."
  )
}

export const env = {
  apiUrl,
} as const
