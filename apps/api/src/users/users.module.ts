import { Module } from "@nestjs/common"
import { AuthModule } from "../auth/auth.module"
import { UsersController } from "./users.controller"
import { UsersRepo } from "./users.repo"
import { UsersService } from "./users.service"

// AuthModule for AuthService: deactivating a user revokes their sessions, and
// the refresh tokens are the auth module's to revoke.
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepo],
})
export class UsersModule {}
