import { Inject, Injectable } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { hash, hashSync, verify } from "@node-rs/argon2"
import {
  organizations,
  refreshTokens,
  users,
  type DatabaseConnection,
  type Organization,
  type User,
} from "@workspace/db"
import { and, eq, isNull, sql } from "drizzle-orm"
import { randomBytes } from "node:crypto"
import { UnauthenticatedError } from "../common/errors/common.errors"
import { normalizeEmail } from "../common/normalize-email"
import { isUniqueViolation } from "../common/postgres-errors"
import { DATABASE_CONNECTION } from "../database/database.module"
import { REFRESH_TOKEN_TTL_SECONDS } from "./auth.constants"
import {
  AccountDisabledError,
  EmailAlreadyTakenError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
  RegistrationClosedError,
} from "./auth.errors"
import type { AccessTokenPayload, SessionContext } from "./auth.types"
import type { LoginDto } from "./dto/login.dto"
import type { RegisterDto } from "./dto/register.dto"
import { toPublicUser, type PublicUser } from "./dto/session.dto"
import { generateRefreshToken, hashRefreshToken } from "./refresh-token"

// Verified against when the email is unknown, so an unknown account costs the
// same time as a wrong password. Skipping the hash would answer in a fraction of
// the time, and that difference alone enumerates accounts.
const ABSENT_USER_PASSWORD_HASH = hashSync(randomBytes(32).toString("hex"))

// Serializes the bootstrap, which reads `organizations` and then writes to it.
// Transaction-scoped: a session-scoped lock would be pinned to a pooled
// connection and outlive the request that took it.
const REGISTRATION_LOCK_KEY = 4_675_301

export interface Session {
  user: PublicUser
  organization: Organization
}

export interface IssuedSession {
  session: Session
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection,
    private readonly jwtService: JwtService
  ) {}

  async register(
    input: RegisterDto,
    context: SessionContext
  ): Promise<IssuedSession> {
    const email = normalizeEmail(input.email)
    const passwordHash = await hash(input.password)

    try {
      const { user, organization } = await this.connection.db.transaction(
        async (tx) => {
          await tx.execute(
            sql`select pg_advisory_xact_lock(${REGISTRATION_LOCK_KEY})`
          )

          const [existing] = await tx
            .select({ id: organizations.id })
            .from(organizations)
            .limit(1)

          if (existing) throw new RegistrationClosedError()

          const created = inserted(
            await tx
              .insert(organizations)
              .values({ name: input.organizationName })
              .returning()
          )

          const owner = inserted(
            await tx
              .insert(users)
              .values({
                orgId: created.id,
                email,
                passwordHash,
                fullName: input.fullName,
                role: "owner",
              })
              .returning()
          )

          return { user: owner, organization: created }
        }
      )

      return await this.issueSession(user, organization, context)
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailAlreadyTakenError()

      throw error
    }
  }

  async login(
    input: LoginDto,
    context: SessionContext
  ): Promise<IssuedSession> {
    const [user] = await this.connection.db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(input.email)))
      .limit(1)

    const passwordMatches = await verify(
      user?.passwordHash ?? ABSENT_USER_PASSWORD_HASH,
      input.password
    )

    if (!user || !passwordMatches) throw new InvalidCredentialsError()
    if (!user.isActive) throw new AccountDisabledError()

    const { organization } = await this.readUserSession(user.id)

    return this.issueSession(user, organization, context)
  }

  /**
   * The revocation is the lookup: a single UPDATE that only matches a token
   * still live. Two requests racing with the same token cannot both come away
   * with a new pair, because only one of them gets a row back.
   */
  async refresh(
    token: string | undefined,
    context: SessionContext
  ): Promise<IssuedSession> {
    if (!token) throw new InvalidRefreshTokenError()

    const tokenHash = hashRefreshToken(token)

    const [claimed] = await this.connection.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt)
        )
      )
      .returning()

    if (!claimed) {
      await this.revokeEverythingIfReused(tokenHash)

      throw new InvalidRefreshTokenError()
    }

    if (claimed.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError()
    }

    const { user, organization } = await this.readUserSession(claimed.userId)

    return this.issueSession(user, organization, context)
  }

  // Never reports whether the token existed: a logout that says "unknown token"
  // is a logout that confirms tokens.
  async logout(token: string | undefined): Promise<void> {
    if (!token) return

    await this.connection.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashRefreshToken(token)),
          isNull(refreshTokens.revokedAt)
        )
      )
  }

  async readSession(userId: string): Promise<Session> {
    const { user, organization } = await this.readUserSession(userId)

    return { user: toPublicUser(user), organization }
  }

  // Deactivating a user must end their sessions now, not whenever each access
  // token happens to expire. Only refresh tokens can be revoked — an access
  // token is trusted by its signature alone — so this caps the lockout at one
  // access-token lifetime, after which no refresh can mint another.
  async revokeAllSessions(userId: string): Promise<void> {
    await this.connection.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt))
      )
  }

  // A token that exists but could not be claimed was already spent, and its
  // holder still has it — so it was copied.
  private async revokeEverythingIfReused(tokenHash: string): Promise<void> {
    const [known] = await this.connection.db
      .select({ userId: refreshTokens.userId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)

    if (!known) return

    await this.connection.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, known.userId),
          isNull(refreshTokens.revokedAt)
        )
      )

    throw new RefreshTokenReusedError()
  }

  private async issueSession(
    user: User,
    organization: Organization,
    context: SessionContext
  ): Promise<IssuedSession> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
    }

    const accessToken = await this.jwtService.signAsync(payload)
    const refreshToken = generateRefreshToken()

    await this.connection.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      userAgent: context.userAgent,
      ip: context.ip,
    })

    return {
      session: { user: toPublicUser(user), organization },
      accessToken,
      refreshToken,
    }
  }

  private async readUserSession(
    userId: string
  ): Promise<{ user: User; organization: Organization }> {
    const [row] = await this.connection.db
      .select({ user: users, organization: organizations })
      .from(users)
      .innerJoin(organizations, eq(organizations.id, users.orgId))
      .where(eq(users.id, userId))
      .limit(1)

    // The token is signed, so its subject was a real user once: a row that is
    // gone means the session is over, not that the caller got it wrong.
    if (!row) {
      throw new UnauthenticatedError("The session's user no longer exists")
    }

    if (!row.user.isActive) throw new AccountDisabledError()

    return row
  }
}

// INSERT ... RETURNING always yields the row it wrote; the array type cannot say
// so.
function inserted<T>(rows: T[]): T {
  const [row] = rows

  if (!row) throw new Error("An insert returned no row")

  return row
}
