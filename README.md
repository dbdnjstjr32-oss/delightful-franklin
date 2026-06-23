# delightful-franklin

A **multilingual creator platform** — a showcase space where designers, developers, 3D artists, and video creators upload their work and get discovered. *“Create. Publish. Be Discovered.”*

## Frontend highlights

- **Internationalization** with `next-intl` — four fully translated locales (English · 한국어 · 日本語 · Español) served via `[locale]` routing
- **Authentication** with Supabase SSR (email + username sign-in), where **Row Level Security** — not the anon key — is the security boundary
- **Hardened by default** — per-request **nonce-based CSP** plus HSTS, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on every response
- **Next.js 16 (App Router) + React 19 + TypeScript**, styled with **Tailwind CSS v4 + shadcn/ui + Base UI + Radix** and animated with **Framer Motion**
- **Tested** — Playwright end-to-end specs and a dedicated RLS policy suite, run in CI on every push

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · @base-ui/react · Framer Motion · Supabase (SSR + RLS) · next-intl · Playwright

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment & database setup

1. Copy the env template and fill in your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

   `.env.local` is gitignored. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is meant to be
   public — your security boundary is Row Level Security, not the key. Set
   `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`) to enable
   username login; without it, email login still works.

2. Apply the database migrations in order. They are idempotent:

   ```bash
   supabase db push
   # or paste these into the SQL editor, in order:
   #   supabase/migrations/0001_review_fixes.sql    (RPCs, FTS index, username unique)
   #   supabase/migrations/0002_security.sql        (RLS, storage policies, view dedup)
   #   supabase/migrations/0003_likes_system.sql    (portfolio_likes table, toggle_like RPC)
   #   supabase/migrations/0004_portfolio_crud.sql  (portfolios bucket, tags, CRUD RPCs)
   ```

   The app degrades gracefully if the RPCs are missing (stats read as 0, view
   counts don't increment), but search, atomic views, and security depend on them.

3. `0002_security.sql` enables RLS and adds policies — verify each one matches
   your schema (e.g. tighten the public `portfolios` SELECT to published rows).

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Start the dev server                  |
| `npm run build`    | Production build                      |
| `npm run lint`     | ESLint                                |
| `npm run typecheck`| `tsc --noEmit`                        |
| `npm run test:e2e` | Playwright smoke tests (needs `.env.local`; run `npx playwright install` once) |
| `npm run test:rls` | RLS integration test — proves policies deny cross-user writes |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, and build on every push/PR.

## Internationalization

Translations live in `messages/{en,ko,ja,es}.json` and load per-route through the
`[locale]` segment, so adding a language is a matter of adding one message file.

## Security verification

- **Headers/CSP**: every response carries HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, plus a
  per-request **nonce-based** `Content-Security-Policy` (script-src locked to the
  nonce + `strict-dynamic`). Verify after `npm run build && npm start` with
  `curl -I http://localhost:3000/en`.
- **RLS**: run `npm run test:rls` against a **staging** project. It creates two
  throwaway users and asserts that cross-user UPDATE/DELETE, anonymous mutations,
  and unauthenticated `toggle_like` are all rejected, then cleans up. Requires
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` in the environment.

## Notes for this Next.js version

This repo runs a build of Next.js where **Middleware is named Proxy** — the
request entry point is `src/proxy.ts`, not `middleware.ts`. APIs differ from
older Next.js; check routing, caching, and data-fetching conventions against the
installed version before changing them.
