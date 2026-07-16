import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common"
import { ApiOperation, ApiResponse } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { LogActivity } from "../activity/log-activity.decorator"
import type { AuthenticatedUser } from "../auth/auth.types"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import { OrgId } from "../auth/decorators/org-id.decorator"
import { Roles } from "../auth/decorators/roles.decorator"
import { ApiErrorDto } from "../common/errors/api-error.dto"
import { CreateUserDto } from "./dto/create-user.dto"
import { ListUsersQueryDto } from "./dto/list-users.dto"
import { ResetPasswordDto } from "./dto/reset-password.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UserDto } from "./dto/user.dto"
import { UsersService } from "./users.service"

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List the staff in the caller's organization" })
  @ZodResponse({ status: HttpStatus.OK, type: [UserDto] })
  list(@OrgId() orgId: string, @Query() query: ListUsersQueryDto) {
    return this.usersService.list(orgId, query)
  }

  @Post()
  @Roles("owner", "admin")
  @ApiOperation({
    summary: "Create a staff account",
    description:
      "The creator sets the initial password. An admin may create members only; only an owner may create another owner or admin.",
  })
  @ZodResponse({ status: HttpStatus.CREATED, type: UserDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "That email already belongs to a user",
    type: ApiErrorDto,
  })
  create(
    @OrgId() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateUserDto
  ) {
    return this.usersService.create(orgId, actor, body)
  }

  @Patch(":id")
  @Roles("owner", "admin")
  @ApiOperation({
    summary: "Update a staff account's name, role, team or active flag",
    description:
      "Nobody may change their own role or deactivate themselves. Assigning a team it does not own, or one from another organization, is refused.",
  })
  @ZodResponse({ status: HttpStatus.OK, type: UserDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No such user, or a team that is not this organization's",
    type: ApiErrorDto,
  })
  update(
    @OrgId() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto
  ) {
    return this.usersService.update(orgId, actor, id, body)
  }

  @Post(":id/reset-password")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  // Without this the audit trail records a POST under /users as `user.create`.
  @LogActivity("user.resetPassword")
  @ApiOperation({ summary: "Set a new password for a staff account" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "The password was replaced",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No such user in this organization",
    type: ApiErrorDto,
  })
  resetPassword(
    @OrgId() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ResetPasswordDto
  ): Promise<void> {
    return this.usersService.resetPassword(orgId, actor, id, body)
  }

  @Delete(":id")
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Deactivate a staff account",
    description:
      "A soft delete via the active flag; a hard delete would orphan this user's messages and appointments. Their sessions are revoked at once.",
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "The account is deactivated and its sessions revoked",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No such user in this organization",
    type: ApiErrorDto,
  })
  remove(
    @OrgId() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.usersService.deactivate(orgId, actor, id)
  }
}
