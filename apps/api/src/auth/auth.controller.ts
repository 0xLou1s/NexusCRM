import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { Response } from "express"
import { ZodResponse } from "nestjs-zod"
import { ApiErrorDto } from "../common/errors/api-error.dto"
import type { Env } from "../config/env"
import { REFRESH_TOKEN_COOKIE } from "./auth.constants"
import { clearSessionCookies, setSessionCookies } from "./auth.cookies"
import { AuthService } from "./auth.service"
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
  SessionContext,
} from "./auth.types"
import { CurrentUser } from "./decorators/current-user.decorator"
import { Public } from "./decorators/public.decorator"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import { SessionDto } from "./dto/session.dto"

@Controller("auth")
export class AuthController {
  // Development is plain HTTP, where a secure cookie is one the browser accepts
  // and never sends back.
  private readonly secureCookies: boolean

  constructor(
    private readonly authService: AuthService,
    config: ConfigService<Env, true>
  ) {
    this.secureCookies =
      config.get("NODE_ENV", { infer: true }) === "production"
  }

  @Post("register")
  @Public()
  @ApiOperation({
    summary: "Bootstrap the first organization and its owner",
    description:
      "Answers exactly once. Every later call is refused: this is a self-hosted instance, not an open sign-up.",
  })
  @ZodResponse({ status: HttpStatus.CREATED, type: SessionDto })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "An organization already exists, so registration is closed",
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "That email already belongs to a user",
    type: ApiErrorDto,
  })
  async register(
    @Body() body: RegisterDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const issued = await this.authService.register(body, contextOf(request))

    setSessionCookies(response, issued, this.secureCookies)

    return issued.session
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange credentials for a session" })
  @ZodResponse({ status: HttpStatus.OK, type: SessionDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unknown email or wrong password — one answer for both",
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "The account has been deactivated",
    type: ApiErrorDto,
  })
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const issued = await this.authService.login(body, contextOf(request))

    setSessionCookies(response, issued, this.secureCookies)

    return issued.session
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rotate the refresh token and mint a new access token",
    description:
      "The presented token is revoked and replaced. Presenting one that was already revoked revokes every session that user holds.",
  })
  @ZodResponse({ status: HttpStatus.OK, type: SessionDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "The refresh token is missing, expired, unknown or replayed",
    type: ApiErrorDto,
  })
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const issued = await this.authService.refresh(
        readRefreshToken(request),
        contextOf(request)
      )

      setSessionCookies(response, issued, this.secureCookies)

      return issued.session
    } catch (error) {
      // Cookies left in place would have the browser replay a dead token on
      // every request from here on.
      clearSessionCookies(response, this.secureCookies)

      throw error
    }
  }

  @Post("logout")
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke the refresh token and clear the cookies" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "The session is over, whether or not it existed",
  })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    await this.authService.logout(readRefreshToken(request))

    clearSessionCookies(response, this.secureCookies)
  }

  @Get("me")
  @ApiOperation({ summary: "The current user and their organization" })
  @ZodResponse({ status: HttpStatus.OK, type: SessionDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "No access token, or one that no longer verifies",
    type: ApiErrorDto,
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.readSession(user.id)
  }
}

function readRefreshToken(request: AuthenticatedRequest): string | undefined {
  const token: unknown = request.cookies?.[REFRESH_TOKEN_COOKIE]

  return typeof token === "string" ? token : undefined
}

function contextOf(request: AuthenticatedRequest): SessionContext {
  return {
    userAgent: request.get("user-agent") ?? null,
    ip: request.ip ?? null,
  }
}
