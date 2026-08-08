import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

/** Site footer. Closes the page with the wordmark at display size — the
 *  editorial bookend to the hero — over two link columns. */
export function Footer({ locale }: { locale: string }) {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const tCategories = useTranslations('categories')
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-[110rem] px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link
              href={`/${locale}`}
              className="font-display text-4xl font-extrabold tracking-tightest text-foreground sm:text-5xl"
            >
              Showcase
              <span aria-hidden className="text-primary">
                .
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('tagline')}
            </p>
          </div>

          <nav aria-labelledby="footer-browse">
            <h2 id="footer-browse" className="overline mb-4 text-muted-foreground">
              {t('browse')}
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href={`/${locale}/explore`}
                  className="text-foreground/80 transition-colors hover:text-foreground"
                >
                  {tNav('explore')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/explore?tab=creators`}
                  className="text-foreground/80 transition-colors hover:text-foreground"
                >
                  {tNav('creators')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/upload`}
                  className="text-foreground/80 transition-colors hover:text-foreground"
                >
                  {tNav('upload')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-categories">
            <h2 id="footer-categories" className="overline mb-4 text-muted-foreground">
              {t('categories')}
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {CATEGORIES.map((category) => (
                <li key={category.key}>
                  <Link
                    href={`/${locale}/explore?category=${category.key}`}
                    className="text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {tCategories(category.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          {t('rights', { year })}
        </p>
      </div>
    </footer>
  )
}
