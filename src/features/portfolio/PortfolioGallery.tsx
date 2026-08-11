'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Download, FileText } from 'lucide-react'
import { useReveal } from '@/lib/motion'
import { formatBytes, type UploadedAsset } from '@/lib/uploads'
import { aspectRatio, parseLayout, type Layout } from '@/lib/presentation'

/** One attachment, framed as the creator asked.
 *
 *  `ratio` is a presentation choice, so when it is set the media fills a box of
 *  that shape and is cropped to fit. Without one, an image keeps its own
 *  proportions and is capped at 80vh — a portrait shot at full width otherwise
 *  turns the page into several screens of scrolling.
 */
function Asset({ asset, fill = false }: { asset: UploadedAsset; fill?: boolean }) {
  const t = useTranslations('work')
  const framed = !!asset.ratio || fill

  if (asset.kind === 'image') {
    if (framed) {
      return (
        <div
          className="relative w-full overflow-hidden rounded-md bg-secondary"
          style={{ aspectRatio: aspectRatio(asset.ratio, asset.width, asset.height) }}
        >
          <Image
            src={asset.url}
            alt={asset.caption || ''}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 60rem, 100vw"
          />
        </div>
      )
    }

    return asset.width && asset.height ? (
      <Image
        src={asset.url}
        alt={asset.caption || ''}
        width={asset.width}
        height={asset.height}
        sizes="(min-width: 1024px) 60rem, 100vw"
        className="mx-auto h-auto max-h-[80vh] w-auto max-w-full rounded-md bg-secondary"
      />
    ) : (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-secondary">
        <Image
          src={asset.url}
          alt={asset.caption || ''}
          fill
          className="object-contain"
          sizes="(min-width: 1024px) 60rem, 100vw"
        />
      </div>
    )
  }

  if (asset.kind === 'video') {
    return (
      // No <track>: creators upload a bare file, and there is no field for
      // captions to come from yet.
      <video
        controls
        preload="metadata"
        className="mx-auto w-full rounded-md bg-black"
        style={
          asset.ratio
            ? { aspectRatio: aspectRatio(asset.ratio), objectFit: 'cover' }
            : { maxHeight: '80vh' }
        }
        src={asset.url}
      />
    )
  }

  if (asset.kind === 'audio') {
    return <audio controls preload="metadata" className="w-full" src={asset.url} />
  }

  return (
    <a
      href={asset.url}
      download
      className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-secondary"
    >
      <FileText size={18} className="shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {asset.caption || asset.storage_path.split('/').pop() || t('attachment_fallback')}
        </span>
        <span className="text-xs text-muted-foreground">
          {asset.mime_type.split('/')[1]?.toUpperCase()} · {formatBytes(asset.size_bytes)}
        </span>
      </span>
      <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </a>
  )
}

/** Everything the creator attached, arranged by the layout preset they chose.
 *
 *  - gallery: a plain stack. The default, and what every work rendered before
 *    presets existed.
 *  - deck: numbered slides in 16:9 frames unless the creator framed them
 *    otherwise — for presentations and demo screenshots.
 *  - case_study: media alternating left and right against its caption, for a
 *    written walkthrough.
 */
export function PortfolioGallery({
  assets,
  layout: layoutInput,
}: {
  assets: UploadedAsset[]
  layout?: string | null
}) {
  const t = useTranslations('work')
  const reveal = useReveal()
  const layout: Layout = parseLayout(layoutInput)

  if (assets.length === 0) return null

  const heading = layout === 'gallery' ? t('gallery_label') : t(`layout_${layout}`)

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[110rem] px-5 py-24 sm:px-8">
        <motion.div {...reveal()} className="grid gap-10 md:grid-cols-[16rem_1fr]">
          <h2 className="overline text-muted-foreground">{heading}</h2>

          {layout === 'deck' ? (
            <ol className="space-y-14">
              {assets.map((asset, i) => (
                <li key={asset.storage_path || asset.url} className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm font-bold tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                  {/* Slides default to a 16:9 frame so a deck reads evenly, but
                      an explicit ratio still wins. */}
                  <Asset asset={asset.ratio ? asset : { ...asset, ratio: '16:9' }} fill />
                  {asset.caption && (
                    <p className="text-sm text-muted-foreground">{asset.caption}</p>
                  )}
                </li>
              ))}
            </ol>
          ) : layout === 'case_study' ? (
            <ul className="space-y-16">
              {assets.map((asset, i) => (
                <li
                  key={asset.storage_path || asset.url}
                  className="grid items-center gap-6 md:grid-cols-2"
                >
                  <div className={i % 2 === 1 ? 'md:order-2' : undefined}>
                    <Asset asset={asset} />
                  </div>
                  {asset.caption && (
                    <p className="max-w-[45ch] text-lg leading-relaxed text-foreground/85">
                      {asset.caption}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-10">
              {assets.map((asset) => (
                <li key={asset.storage_path || asset.url} className="space-y-3">
                  <Asset asset={asset} />
                  {asset.caption && asset.kind !== 'file' && (
                    <p className="text-sm text-muted-foreground">{asset.caption}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </section>
  )
}
