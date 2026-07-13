// lib/env.ts validates this at import time. Nothing here talks to a real API —
// the fetch is stubbed — so the value only has to parse as a URL.
process.env.NEXT_PUBLIC_API_URL = "http://api.test"
