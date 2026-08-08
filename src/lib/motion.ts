'use client'

import { useReducedMotion } from 'framer-motion'

/** Slow-out ease shared by every reveal, so the whole site moves as one piece. */
export const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

type RevealProps = {
  initial: { opacity: number; y?: number }
  whileInView: { opacity: number; y?: number }
  viewport: { once: true; margin: string }
  transition: { delay: number; duration: number; ease?: [number, number, number, number] }
}

/** Scroll reveal props for a section or the nth item inside one.
 *
 *  Respects `prefers-reduced-motion`: the CSS reset in globals.css flattens
 *  transitions, but Framer animates inline styles and ignores it — so the
 *  travel distance is dropped here too, leaving a plain fade. */
export function useReveal() {
  const prefersReduced = useReducedMotion()

  return function reveal(index = 0): RevealProps {
    if (prefersReduced) {
      return {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true, margin: '-40px' },
        transition: { delay: 0, duration: 0.2 },
      }
    }

    return {
      initial: { opacity: 0, y: 28 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: '-60px' },
      transition: { delay: index * 0.06, duration: 0.6, ease: EDITORIAL_EASE },
    }
  }
}
