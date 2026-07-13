import {
  Body,
  Controller,
  HttpStatus,
  Post,
  type INestApplication,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { createZodDto } from "nestjs-zod"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { z } from "zod"
import { AppModule } from "../src/app.module"
import { Public } from "../src/auth/decorators/public.decorator"
import { ERROR_KEYS } from "../src/common/errors/error-keys"
import { customIssue } from "../src/common/errors/zod-issue"

const signUpSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    ...customIssue(ERROR_KEYS.validation.custom, "Passwords do not match"),
    path: ["confirmPassword"],
  })

class SignUpDto extends createZodDto(signUpSchema) {}

// A throwaway endpoint, so the global pipe and the global filter can be
// exercised together without tying this to any real route's schema. @Public()
// because the global JwtAuthGuard would otherwise 401 it before the pipe runs,
// and validation is what this file is about.
@Controller("__probe")
class ProbeController {
  @Post()
  @Public()
  create(@Body() body: SignUpDto) {
    return body
  }
}

describe("request validation", () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("answers 422 and names every field that failed", async () => {
    const response = await request(app.getHttpServer())
      .post("/__probe")
      .send({ email: "nope", password: "short", confirmPassword: "other" })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY)

    expect(response.body).toEqual({
      code: "common.validationFailed",
      message: "The request failed validation",
      issues: [
        {
          path: "email",
          code: "validation.invalidFormat",
          message: expect.any(String),
          params: expect.objectContaining({ format: "email" }),
        },
        {
          path: "password",
          code: "validation.tooSmall",
          message: expect.any(String),
          params: expect.objectContaining({ minimum: 8 }),
        },
        {
          path: "confirmPassword",
          code: "validation.custom",
          message: "Passwords do not match",
        },
      ],
    })
  })

  it("sends a key and the failed constraint, not a sentence to display", async () => {
    const response = await request(app.getHttpServer())
      .post("/__probe")
      .send({ email: "a@b.co", password: "short", confirmPassword: "short" })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY)

    expect(response.body.issues).toEqual([
      {
        path: "password",
        code: "validation.tooSmall",
        message: expect.any(String),
        params: expect.objectContaining({ minimum: 8 }),
      },
    ])
  })

  it("accepts a request that satisfies the schema", async () => {
    await request(app.getHttpServer())
      .post("/__probe")
      .send({
        email: "someone@example.com",
        password: "long-enough",
        confirmPassword: "long-enough",
      })
      .expect(HttpStatus.CREATED)
  })
})
