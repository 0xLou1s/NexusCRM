import type { INestApplication } from "@nestjs/common"
import cookieParser from "cookie-parser"

/**
 * The middleware every instance of the app needs, wherever it is booted from.
 *
 * main.ts is not the only place the app is created — the integration harness
 * builds it too, and a guard that reads `request.cookies` needs the parser in
 * both. Anything a request passes through before Nest's own pipeline belongs
 * here; CORS and Swagger stay in main.ts, because they are about serving the
 * app rather than handling a request.
 */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser())
}
