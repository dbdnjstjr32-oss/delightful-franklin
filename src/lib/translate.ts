import 'server-only'
import { logger } from '@/lib/logger'

// Server-side machine translation with an in-memory cache. Creators can author
// in any language; readers on a non-source locale get a translated view.
//
// PROVIDER NOTE: this uses Google's public (unofficial, key-less) translate
// endpoint — fine for development/demo. For production, swap the fetch in
// `callProvider` for DeepL or Google Cloud Translation with an API key. The
// caching + call sites stay the same. On ANY failure we return the original
// text, so translation can never break a render.

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

/** Scripts that are cheap to recognise. When the text is already written in the
 *  target's script there is nothing to do, so the round-trip is skipped.
 *
 *  This replaces an earlier `if (target === 'en') return text` shortcut, which
 *  made translation one-way: an English description was translated for Korean
 *  readers, but a Korean one was left in Korean for English readers. Latin-
 *  script locales (en, es) share a script and cannot be told apart here, so
 *  they fall through to the provider — it auto-detects the source and returns
 *  the text unchanged when it already matches the target. */
const ALREADY_IN_TARGET: Record<string, RegExp> = {
  ko: /[가-힣]/,
  ja: /[぀-ゟ゠-ヿ]/,
}

async function callProvider(text: string, target: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=` +
    encodeURIComponent(text)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = (await res.json()) as [Array<[string]>]
    const out = (data?.[0] ?? []).map((seg) => seg?.[0] ?? '').join('')
    return out || text
  } finally {
    clearTimeout(timer)
  }
}

/** Translate `text` into `target` locale. Returns the original on no-op or failure.
 *
 *  Meant for prose a creator wrote — a description, a bio. NOT for titles: a
 *  work's title is its name, and machine-translating "Neon Drive — Loop" into
 *  each locale renames the piece rather than explaining it. */
export async function translateText(
  text: string | null | undefined,
  target: string
): Promise<string> {
  if (!text || !text.trim()) return text ?? ''
  if (ALREADY_IN_TARGET[target]?.test(text)) return text

  const key = `${target}:${text}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const pending = inflight.get(key)
  if (pending) return pending

  const promise = (async () => {
    try {
      const translated = await callProvider(text, target)
      cache.set(key, translated)
      return translated
    } catch (e) {
      logger.warn('translate failed; using source text', {
        target,
        error: e instanceof Error ? e.message : String(e),
      })
      return text
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, promise)
  return promise
}
