import { Inject, Injectable } from "@nestjs/common"
import { teams, users, type DatabaseConnection, type User } from "@workspace/db"
import { and, eq, type SQL } from "drizzle-orm"
import { OrgScopedRepository } from "../common/database/org-scoped.repository"
import { DATABASE_CONNECTION } from "../database/database.module"
import type { ListUsersFilters } from "./dto/list-users.dto"

@Injectable()
export class UsersRepository extends OrgScopedRepository<typeof users> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    connection: DatabaseConnection
  ) {
    super(connection, users)
  }

  async list(orgId: string, filters: ListUsersFilters): Promise<User[]> {
    const conditions: SQL[] = []

    if (filters.role) conditions.push(eq(users.role, filters.role))
    if (filters.teamId) conditions.push(eq(users.teamId, filters.teamId))
    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive))
    }

    return this.db
      .select()
      .from(users)
      .where(this.within(orgId, ...conditions))
      .orderBy(users.createdAt)
  }

  // The `users.team_id` FK does not carry an organization, so it cannot stop a
  // user from pointing at a team in another org. Assignment goes through this
  // check, which is org-scoped, instead of trusting the foreign key alone.
  async teamBelongsToOrg(orgId: string, teamId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.orgId, orgId), eq(teams.id, teamId)))
      .limit(1)

    return Boolean(row)
  }
}
