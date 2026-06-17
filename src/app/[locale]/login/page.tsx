import { LoginForm } from "@/features/auth/components/LoginForm"

type Props = {
  searchParams: Promise<{ notice?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { notice, error } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pt-16">
      <div className="w-full max-w-sm">
        <LoginForm notice={notice} initialError={error} />
      </div>
    </div>
  )
}
