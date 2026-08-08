// Regenerates supabase/setup.sql — every migration concatenated in order, so a
// fresh project can be set up with one paste into the SQL editor.
//
// Run: node supabase/build-setup.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, 'migrations')

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const header = `-- =============================================================================
-- GENERATED FILE - do not edit by hand.
-- Concatenation of supabase/migrations/*.sql in order, for setting up a fresh
-- Supabase project in a single paste into the SQL editor.
-- Regenerate with: node supabase/build-setup.mjs
-- Every statement is idempotent, so re-running is safe.
-- =============================================================================
`

const body = files
  .map((f) => {
    const rule = '-'.repeat(Math.max(0, 60 - f.length))
    return `\n-- >>>>> ${f} ${rule}\n\n${readFileSync(join(migrationsDir, f), 'utf8')}`
  })
  .join('\n')

writeFileSync(join(here, 'setup.sql'), header + body)
console.log(`setup.sql rebuilt from ${files.length} migrations:\n  ${files.join('\n  ')}`)
