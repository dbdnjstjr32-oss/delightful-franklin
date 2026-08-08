import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[110rem] flex-col justify-center px-5 pt-24 sm:px-8">
      <p className="overline text-muted-foreground">Error 404</p>
      <h1 className="mt-6 font-display text-6xl font-extrabold tracking-tightest text-foreground sm:text-8xl">
        This page
        <br />
        <span className="text-muted-foreground">doesn&apos;t exist.</span>
      </h1>
      <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">
        The link may be broken, or the work you were looking for has been taken down.
      </p>
      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
