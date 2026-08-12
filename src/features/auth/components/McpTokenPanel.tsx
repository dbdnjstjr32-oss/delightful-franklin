'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

/** Hands the creator the refresh token their MCP server needs.
 *
 *  Read from the browser's own session on click rather than server-rendered
 *  into the page: a refresh token grants full account access, and putting one
 *  in HTML means it sits in the document source, in any intermediate cache,
 *  and in a screenshot of this page. This way it only exists on screen while
 *  the creator has deliberately revealed it.
 */
export function McpTokenPanel() {
  const t = useTranslations('auth')
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function reveal() {
    setLoading(true)
    try {
      const { data } = await createClient().auth.getSession()
      const refresh = data.session?.refresh_token
      if (!refresh) {
        toast.error(t('mcp_no_session'))
        return
      }
      setToken(refresh)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error(t('mcp_copy_failed'))
    }
  }

  return (
    <div className="py-6">
      <dt className="font-display text-xl font-bold tracking-tightest">{t('mcp_title')}</dt>
      <dd className="mt-1 space-y-4 text-sm text-muted-foreground">
        <p>{t('mcp_body')}</p>

        {token ? (
          <div className="space-y-3">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-medium text-destructive">
              {t('mcp_warning')}
            </p>
            <code className="block overflow-x-auto rounded-md border border-border bg-secondary/50 px-4 py-3 font-mono text-xs break-all text-foreground">
              {token}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={copy}
                className="h-10 rounded-full px-4 text-sm"
              >
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                <span className="ml-1.5">{copied ? t('mcp_copied') : t('mcp_copy')}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setToken(null)}
                className="h-10 rounded-full px-4 text-sm"
              >
                <EyeOff size={14} aria-hidden />
                <span className="ml-1.5">{t('mcp_hide')}</span>
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={reveal}
            disabled={loading}
            className="h-10 rounded-full px-4 text-sm"
          >
            <Eye size={14} aria-hidden />
            <span className="ml-1.5">{t('mcp_reveal')}</span>
          </Button>
        )}
      </dd>
    </div>
  )
}
