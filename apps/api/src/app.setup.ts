import type { INestApplication } from "@nestjs/common"
import cookieParser from "cookie-parser"

/**
 * Middleware every instance of the app needs, wherever it is booted from: the
 * integration harness creates the app too, and a guard reading `request.cookies`
 * needs the parser in both. CORS and Swagger stay in main.ts, because they are
 * about serving the app rather than handling a request.
 */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser())
}
