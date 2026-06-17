This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
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
   #   supabase/migrations/0001_review_fixes.sql   (RPCs, FTS index, username unique)
   #   supabase/migrations/0002_security.sql       (RLS, storage policies, view dedup)
   #   supabase/migrations/0003_portfolio_crud.sql (portfolios bucket, tags, CRUD RPCs)
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

CI (`.github/workflows/ci.yml`) runs lint, typecheck, and build on every push/PR.

## Notes for this Next.js version

This repo runs a build of Next.js where **Middleware is named Proxy** — the
request entry point is `src/proxy.ts`, not `middleware.ts`. Read the bundled
guides under `node_modules/next/dist/docs/` before changing routing, caching, or
data-fetching code; APIs differ from older Next.js.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
