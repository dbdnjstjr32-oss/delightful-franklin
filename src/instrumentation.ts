import type { Instrumentation } from 'next'
import { logger } from '@/lib/logger'

// Runs once per server instance. Confirms instrumentation is wired and is where
// you'd initialize an OTel/APM SDK (registerOTel, Sentry.init, …).
export function register() {
  logger.info('instrumentation registered', { runtime: process.env.NEXT_RUNTIME })
}

// Central capture for server-side errors — Server Component renders, Route
// Handlers, Server Actions, and Proxy. Forward to an external provider here.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as (Error & { digest?: string }) | undefined
  logger.error('request_error', {
    message: e?.message ?? String(err),
    digest: e?.digest,
    stack: e?.stack,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  })
}
