'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Download, FileText } from 'lucide-react'
import { useReveal } from '@/lib/motion'
import { formatBytes, type UploadedAsset } from '@/lib/uploads'

/** Everything the creator attached to the work, in the order they arranged it
 *  in the studio. Images get their measured aspect ratio so the page stops
 *  jumping as they load; anything a browser cannot render inline falls back to
 *  a download row. */
export function PortfolioGallery({ assets }: { assets: UploadedAsset[] }) {
  const t = useTranslations('work')
  const reveal = useReveal()

  if (assets.length === 0) return null

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[110rem] px-5 py-24 sm:px-8">
        <motion.div {...reveal()} className="grid gap-10 md:grid-cols-[16rem_1fr]">
          <h2 className="overline text-muted-foreground">{t('gallery_label')}</h2>

          <ul className="space-y-10">
            {assets.map((asset) => (
              <li key={asset.storage_path || asset.url} className="space-y-3">
                {asset.kind === 'image' &&
                  (asset.width && asset.height ? (
                    // Intrinsic width/height rather than a `fill` box: a full-
                    // width box at the image's own ratio turns a portrait shot
                    // into three screens of scrolling. The attributes still
                    // reserve the right space, and max-h caps the tall ones.
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
                  ))}

                {asset.kind === 'video' && (
                  // No <track>: creators upload a bare file, and there is no
                  // field for captions to come from yet.
                  <video
                    controls
                    preload="metadata"
                    className="mx-auto max-h-[80vh] w-full rounded-md bg-black"
                    src={asset.url}
                  />
                )}

                {asset.kind === 'audio' && (
                  <audio controls preload="metadata" className="w-full" src={asset.url} />
                )}

                {asset.kind === 'file' && (
                  <a
                    href={asset.url}
                    download
                    className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <FileText size={18} className="shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {asset.caption ||
                          asset.storage_path.split('/').pop() ||
                          t('attachment_fallback')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {asset.mime_type.split('/')[1]?.toUpperCase()} · {formatBytes(asset.size_bytes)}
                      </span>
                    </span>
                    <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                  </a>
                )}

                {asset.caption && asset.kind !== 'file' && (
                  <p className="text-sm text-muted-foreground">{asset.caption}</p>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
