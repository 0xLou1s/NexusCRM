import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import type { Env } from "../config/env"
import { ACCESS_TOKEN_TTL_SECONDS } from "./auth.constants"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get("JWT_SECRET", { infer: true }),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // JwtModule is exported with the guard: PR 1.3 promotes it to a global
  // APP_GUARD, and a guard cannot inject a JwtService its module cannot see.
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
