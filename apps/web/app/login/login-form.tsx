"use client"

import { useLogin } from "@/hooks/data/auth/use-login"
import { handleApiError } from "@/lib/forms/handle-api-error"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

interface LoginFields {
  email: string
  password: string
}

export function LoginForm() {
  const router = useRouter()
  const { login, isPending } = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, setError } = useForm<LoginFields>({
    defaultValues: { email: "", password: "" },
  })

  async function submit(fields: LoginFields) {
    try {
      await login(fields)
      router.refresh()
    } catch (error) {
      handleApiError(error, setError)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <Controller
        control={control}
        name="email"
        rules={{ required: "Enter your email address." }}
        render={({ field, fieldState }) => (
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="username"
            leftIcon={<Mail />}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: "Enter your password." }}
        render={({ field, fieldState }) => (
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            leftIcon={<Lock />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="pointer-events-auto"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            }
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={fieldState.error?.message}
          />
        )}
      />

      <StatefulButton
        type="submit"
        variant="primary"
        size="md"
        state={isPending ? "loading" : "idle"}
        disabled={isPending}
        loadingText="Signing in"
        icon={<ArrowRight />}
      >
        Sign in
      </StatefulButton>
    </form>
  )
}
