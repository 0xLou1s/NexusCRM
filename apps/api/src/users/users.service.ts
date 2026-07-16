import { Injectable } from "@nestjs/common"
import { hash } from "@node-rs/argon2"
import type { User, UserRole } from "@workspace/db"
import { EmailAlreadyTakenError } from "../auth/auth.error"
import { toPublicUser, type PublicUser } from "../auth/auth.model"
import { AuthService } from "../auth/auth.service"
import type { AuthenticatedUser } from "../auth/auth.types"
import { normalizeEmail } from "../common/normalize-email"
import { isUniqueViolation } from "../common/postgres-errors"
import type {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
} from "./users.dto"
import {
  CannotAssignRoleError,
  CannotDeactivateSelfError,
  CannotDemoteSelfError,
  CannotManageUserError,
  TeamNotFoundError,
  UserNotFoundError,
} from "./users.error"
import type { ListUsersFilters } from "./users.model"
import { UsersRepo } from "./users.repo"

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepo,
    private readonly authService: AuthService
  ) {}

  async list(orgId: string, filters: ListUsersFilters): Promise<PublicUser[]> {
    const rows = await this.repository.list(orgId, filters)

    return rows.map(toPublicUser)
  }

  async create(
    orgId: string,
    actor: AuthenticatedUser,
    dto: CreateUserDto
  ): Promise<PublicUser> {
    this.assertCanAssignRole(actor, dto.role)

    const passwordHash = await hash(dto.password)

    try {
      const created = await this.repository.insert(orgId, {
        email: normalizeEmail(dto.email),
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
      })

      return toPublicUser(created)
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailAlreadyTakenError()

      throw error
    }
  }

  async update(
    orgId: string,
    actor: AuthenticatedUser,
    targetId: string,
    patch: UpdateUserDto
  ): Promise<PublicUser> {
    const target = await this.loadTarget(orgId, targetId)
    const isSelf = targetId === actor.id

    if (isSelf) {
      if (patch.role !== undefined && patch.role !== target.role) {
        throw new CannotDemoteSelfError()
      }
      if (patch.isActive === false) throw new CannotDeactivateSelfError()
    } else {
      this.assertCanManageTarget(actor, target)
      if (patch.role !== undefined && patch.role !== target.role) {
        this.assertCanAssignRole(actor, patch.role)
      }
    }

    if (patch.teamId != null) await this.assertTeamInOrg(orgId, patch.teamId)

    if (Object.keys(patch).length === 0) return toPublicUser(target)

    const updated = await this.repository.update(orgId, targetId, patch)
    // `loadTarget` already proved the row is in this org and `update` is scoped
    // the same way; a miss here means it was deleted in between.
    if (!updated) throw new UserNotFoundError()

    // Deactivating through PATCH ends sessions exactly as DELETE does.
    if (target.isActive && patch.isActive === false) {
      await this.authService.revokeAllSessions(targetId)
    }

    return toPublicUser(updated)
  }

  async resetPassword(
    orgId: string,
    actor: AuthenticatedUser,
    targetId: string,
    dto: ResetPasswordDto
  ): Promise<void> {
    const target = await this.loadTarget(orgId, targetId)

    if (targetId !== actor.id) this.assertCanManageTarget(actor, target)

    await this.repository.update(orgId, targetId, {
      passwordHash: await hash(dto.password),
    })
  }

  // Soft delete: `is_active = false`. A hard delete would orphan the messages
  // and appointments this user is referenced by.
  async deactivate(
    orgId: string,
    actor: AuthenticatedUser,
    targetId: string
  ): Promise<void> {
    const target = await this.loadTarget(orgId, targetId)

    if (targetId === actor.id) throw new CannotDeactivateSelfError()
    this.assertCanManageTarget(actor, target)

    if (!target.isActive) return

    await this.repository.update(orgId, targetId, { isActive: false })
    await this.authService.revokeAllSessions(targetId)
  }

  private async loadTarget(orgId: string, id: string): Promise<User> {
    const target = await this.repository.findById(orgId, id)

    if (!target) throw new UserNotFoundError()

    return target
  }

  private assertCanManageTarget(actor: AuthenticatedUser, target: User): void {
    if (actor.role === "owner") return
    if (target.role !== "member") throw new CannotManageUserError()
  }

  private assertCanAssignRole(actor: AuthenticatedUser, role: UserRole): void {
    if (actor.role === "owner") return
    if (role !== "member") throw new CannotAssignRoleError()
  }

  private async assertTeamInOrg(orgId: string, teamId: string): Promise<void> {
    if (!(await this.repository.teamBelongsToOrg(orgId, teamId))) {
      throw new TeamNotFoundError()
    }
  }
}
