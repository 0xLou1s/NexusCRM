import { inject } from "vitest"

// Runs before the test file imports AppModule, which is when ConfigModule reads
// and validates the environment. @nestjs/config lets process.env win over the
// root .env file, so pointing these at the containers is enough to redirect the
// whole app — no provider needs overriding.
process.env.DATABASE_URL = inject("databaseUrl")
process.env.REDIS_URL = inject("redisUrl")

// Fixed rather than taken from the developer's .env: a test that signs a token
// must sign the same token on every machine and in CI, which has no .env at all.
process.env.JWT_SECRET = "integration-test-secret-at-least-32-characters"
