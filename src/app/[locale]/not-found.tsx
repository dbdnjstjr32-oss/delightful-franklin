import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-bold tracking-tight mb-3">404</div>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-80 transition-opacity"
      >
        Go home
      </Link>
    </div>
  )
}
