'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useReveal } from '@/lib/motion'

/** Shared section masthead: kicker, display heading, and an optional link out.
 *  Every landing section used to hand-roll this block with slightly different
 *  spacing and easing. */
export function SectionHeading({
  kicker,
  title,
  href,
  linkLabel,
}: {
  kicker: string
  title: string
  href?: string
  linkLabel?: string
}) {
  const reveal = useReveal()

  return (
    <motion.div {...reveal()} className="mb-12 flex items-end justify-between gap-6 border-b border-border pb-6">
      <div>
        <p className="overline text-muted-foreground">{kicker}</p>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tightest sm:text-5xl">
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group hidden shrink-0 items-center gap-1 pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          {linkLabel}
          <ArrowUpRight
            size={15}
            aria-hidden
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </motion.div>
  )
}
