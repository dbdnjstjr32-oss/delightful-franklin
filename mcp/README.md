# Showcase MCP server

Exposes the Showcase portfolio site as MCP tools, so Claude can search published
work and manage your own from an editor.

## Design

Read tools use the **publishable (anon) key** and see exactly what a logged-out
visitor sees — RLS decides, not this code. Write tools authenticate as a real
user, so they are subject to the same policies as the browser: a bug here can
never reach another creator's rows. **No service-role key is used anywhere.**

## Setup

```bash
cd mcp
npm install
npm run build
```

### Configuration

| Variable | Required | What |
| --- | --- | --- |
| `SHOWCASE_SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `SHOWCASE_SUPABASE_ANON_KEY` | yes | The publishable key. Public by design — it already ships in the site's JavaScript. |
| `SHOWCASE_REFRESH_TOKEN` | for write tools | From **Settings → Claude / MCP** on the site |
| `SHOWCASE_SITE_URL` | no | Used to build links back to works. Defaults to the production site. |
| `SHOWCASE_CREDENTIALS_PATH` | no | Where the rotated token is kept. Defaults to `~/.showcase-mcp/credentials.json`. |

Without `SHOWCASE_REFRESH_TOKEN` the read tools work fine and the write tools
fail with a message telling you how to enable them.

### About the refresh token

Supabase **rotates** refresh tokens: each refresh returns a new one and retires
the old. A token pinned in an env var would work exactly once, so the env var is
only a *seed* — after the first run the live token is kept in
`~/.showcase-mcp/credentials.json` (mode `600`) and rewritten on every refresh.

That token grants full access to your account. Treat it like a password: don't
commit it, don't paste it into a chat. If it leaks, sign out everywhere on the
site to invalidate it.

### Wiring it up

Add to `.mcp.json` (project) or your user MCP config:

```json
{
  "mcpServers": {
    "showcase": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "SHOWCASE_SUPABASE_URL": "https://<project-ref>.supabase.co",
        "SHOWCASE_SUPABASE_ANON_KEY": "sb_publishable_…",
        "SHOWCASE_REFRESH_TOKEN": "…"
      }
    }
  }
}
```

## Tools

### Read — no account needed

| Tool | Does |
| --- | --- |
| `search_works` | Keyword / category / popularity search over published works |
| `get_work` | One work in full: description, tags, layout, ordered attachments |
| `get_creator` | A creator's public profile and published works, by username |
| `list_categories` | Valid category and layout keys |

### Write — needs `SHOWCASE_REFRESH_TOKEN`

| Tool | Does |
| --- | --- |
| `list_my_works` | Your own works, drafts included |
| `create_work` | Create a work (a draft unless you say otherwise) |
| `update_work` | Change fields on your own work; `tags` replaces the whole set |
| `set_work_status` | Publish a draft, or pull a work back to draft |
| `delete_work` | Permanent, ownership-checked delete |

## Limitation: no file uploads

`create_work` makes the entry; it cannot attach files. Uploads go
browser-to-storage with a signed URL and per-file progress (see
`src/features/portfolio/upload-client.ts`), which does not translate to a
stdio tool. Create the work here, then add files from the site's upload form —
`create_work` returns an `edit_url` for exactly that.

## Keeping in step with the app

`CATEGORIES` and `LAYOUTS` are duplicated in `src/index.ts` rather than imported,
so this package builds without the Next.js app installed. If you change
`src/lib/categories.ts` or `src/lib/presentation.ts`, change them here too.
