import { LoginForm } from "@/features/auth/components/LoginForm"

type Props = {
  searchParams: Promise<{ notice?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { notice, error } = await searchParams

  return (
    <div className="mx-auto w-full max-w-md px-5 pt-36 pb-24 sm:px-8">
      <LoginForm notice={notice} initialError={error} />
    </div>
  )
}
