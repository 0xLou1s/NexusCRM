import { LoginForm } from "@/app/login/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="sr-only mb-6 text-lg font-medium">Sign in</h1>
        <LoginForm />
      </div>
    </main>
  )
}
