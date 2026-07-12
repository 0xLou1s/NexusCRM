import { config as loadEnv } from "dotenv"
import { execFileSync } from "node:child_process"

/**
 * Regenerates `packages/api-types/schema.d.ts` from a running API.
 *
 * The API serves its OpenAPI document at `/openapi.json` (Swagger, from the Zod
 * DTOs). Pointing this at a deployed environment is the point: a frontend
 * developer regenerates types from the API that is actually running, without
 * having to check out, install and boot the backend branch first.
 *
 * CI points the same script at an API it starts itself, so the committed types
 * can still be regenerated and diffed against the commit.
 */
loadEnv({ quiet: true })

const OUTPUT = "packages/api-types/schema.d.ts"

const baseUrl = process.env.API_URL

if (!baseUrl) {
  console.error(
    "API_URL is not set. Copy .env.example to .env, or point it at a deployed API."
  )
  process.exit(1)
}

const schemaUrl = `${baseUrl.replace(/\/+$/, "")}/openapi.json`

console.log(`Generating ${OUTPUT} from ${schemaUrl}`)

try {
  execFileSync(
    "pnpm",
    ["exec", "openapi-typescript", schemaUrl, "--output", OUTPUT],
    { stdio: "inherit" }
  )
} catch {
  console.error(
    `\nCould not read ${schemaUrl}. Is the API running? Start it with \`pnpm --filter api dev\`.`
  )
  process.exit(1)
}

// The generated file is committed, and lint-staged formats what is committed.
// Formatting it here too keeps "generated" and "committed" byte-identical, which
// is what lets CI regenerate and diff.
execFileSync(
  "pnpm",
  ["exec", "prettier", "--write", "--log-level", "warn", OUTPUT],
  { stdio: "inherit" }
)
