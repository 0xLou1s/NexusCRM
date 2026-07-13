import { inject } from "vitest"

// Runs before the test file imports AppModule, which is when ConfigModule reads
// and validates the environment. @nestjs/config lets process.env win over the
// root .env file, so pointing these at the containers is enough to redirect the
// whole app — no provider needs overriding.
process.env.DATABASE_URL = inject("databaseUrl")
process.env.REDIS_URL = inject("redisUrl")
