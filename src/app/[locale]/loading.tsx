export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
