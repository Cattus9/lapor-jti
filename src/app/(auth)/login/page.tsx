import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-3">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  )
}
