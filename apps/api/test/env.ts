import { inject } from "vitest"

// Runs before the test file imports AppModule, which is when ConfigModule reads
// the environment. process.env wins over the root .env file, so pointing these
// at the containers redirects the whole app with no provider overridden.
process.env.DATABASE_URL = inject("databaseUrl")
process.env.REDIS_URL = inject("redisUrl")

// Fixed, not from the developer's .env: CI has no .env at all.
process.env.JWT_SECRET = "integration-test-secret-at-least-32-characters"
