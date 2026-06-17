import { SignupForm } from "@/features/auth/components/SignupForm"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pt-16">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
