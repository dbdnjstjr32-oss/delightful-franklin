// Tiny structured logger. JSON lines in production (ingestible by any log drain
// / APM), readable in development. This is the single seam where you'd later
// forward to Sentry, Datadog, etc. — keep call sites using `logger`, not
// `console`, so that wiring lives in one place.

type Level = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Record<string, unknown>

const isProd = process.env.NODE_ENV === 'production'

function emit(level: Level, message: string, fields?: LogFields) {
  const entry = { level, message, time: new Date().toISOString(), ...fields }
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log

  if (isProd) {
    sink(JSON.stringify(entry))
  } else {
    sink(`[${level}] ${message}`, fields ?? '')
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit('debug', message, fields),
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields) => emit('warn', message, fields),
  error: (message: string, fields?: LogFields) => emit('error', message, fields),
}
