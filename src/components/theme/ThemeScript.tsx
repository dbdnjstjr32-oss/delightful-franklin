/** Pre-hydration theme resolution.
 *
 *  The server already stamps `class="dark"` on <html> when the visitor has a
 *  stored preference, so returning visitors never flash. This script only
 *  handles the *first* visit, where there is no cookie and the OS setting is
 *  the best guess — it runs before the body paints, so there is still no flash.
 *
 *  The nonce is mandatory: proxy.ts serves `script-src 'self' 'nonce-…'
 *  'strict-dynamic'`, which blocks unsigned inline scripts outright.
 */
export function ThemeScript({ nonce, hasStoredTheme }: { nonce?: string; hasStoredTheme: boolean }) {
  if (hasStoredTheme) return null

  const script = `try{if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}`

  // React strips the nonce from the client-side props, so the attribute is
  // expected to differ between server and client render.
  return <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />
}
