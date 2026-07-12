import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

async function bootstrap() {
  // Standalone context, no HTTP listener: api and the worker only ever talk
  // through Redis (spec §3.2). The BullMQ connection keeps the process alive.
  const app = await NestFactory.createApplicationContext(AppModule)
  app.enableShutdownHooks()
}
void bootstrap()
