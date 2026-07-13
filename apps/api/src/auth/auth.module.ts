import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { APP_GUARD } from "@nestjs/core"
import { JwtModule } from "@nestjs/jwt"
import type { Env } from "../config/env"
import { ACCESS_TOKEN_TTL_SECONDS } from "./auth.constants"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { RolesGuard } from "./guards/roles.guard"

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
  providers: [
    AuthService,
    // Every endpoint in the application, not only this module's: a new route is
    // protected the moment it exists, and opts out with @Public() rather than
    // opting in with @UseGuards().
    //
    // Registration order is execution order — a role cannot be checked before
    // the token carrying it has been verified.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
