'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { toggleLike } from '@/features/portfolio/likes-actions'

type Props = {
  portfolioId: string
  initialLiked: boolean
  initialCount: number
  isAuthed: boolean
}

export function LikeButton({ portfolioId, initialLiked, initialCount, isAuthed }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onClick() {
    if (!isAuthed) {
      router.push('/login')
      return
    }

    // Optimistic update with revert on failure.
    const prevLiked = liked
    const prevCount = count
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))

    startTransition(async () => {
      const result = await toggleLike(portfolioId)
      if ('error' in result) {
        setLiked(prevLiked)
        setCount(prevCount)
      } else {
        // Trust the server's authoritative liked state.
        setLiked(result.liked)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={liked}
      aria-label={liked ? 'Remove appreciation' : 'Appreciate this work'}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
        liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Heart size={15} className={liked ? 'fill-current' : ''} />
      <span>{count.toLocaleString()} appreciations</span>
    </button>
  )
}
