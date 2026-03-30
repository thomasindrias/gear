# Gear

The package manager for AI agent configs. Share, discover, and hot-swap agent configurations in seconds.

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 15 (App Router), React 19, Tailwind CSS 4, Framer Motion, tRPC 11
- **CLI:** Commander.js, published as `gearsh` on npm
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Shared:** Zod schemas + YAML parser for the Gearfile format
- **Language:** TypeScript (ESM, ES2022)

## Project Structure

```
apps/web/          → Next.js web app (gear-beige.vercel.app)
packages/cli/      → CLI tool (npx gearsh)
packages/shared/   → Gearfile schema, parser, serializer
packages/db/       → Supabase client factory and DB types
supabase/          → Migrations (applied via supabase db push)
```

## Development

```bash
pnpm install
pnpm dev              # starts web app + watchers
pnpm build            # build all packages
pnpm typecheck        # typecheck everything
```

### CLI development

```bash
pnpm --filter gearsh build
node packages/cli/dist/index.js --help
```

### Database migrations

Migrations live in `supabase/migrations/` and `packages/db/supabase/migrations/`. To apply:

```bash
supabase db push --linked          # push new migrations
supabase db push --linked --include-all  # if ordering mismatch
```

## Key Conventions

- tRPC routers are in `apps/web/server/routers/`
- Supabase auth uses GitHub OAuth; tokens use `gear_pat_` prefix
- CLI types mirror server types manually in `packages/cli/src/types/api.ts` (no shared tRPC dependency)
- The CLI's tRPC client points to `https://gear-beige.vercel.app` by default (configurable via `--registry`)
- Platform adapters in `packages/cli/src/adapters/` handle claude-code and gemini-cli config formats

## Publishing

CLI is published via GitHub Actions on tag push:

```bash
# bump version in packages/cli/package.json, then:
git tag cli@X.Y.Z
git push && git push origin cli@X.Y.Z
```

This triggers `.github/workflows/publish-cli.yml` which builds, tests, and publishes both `gear-shared` and `gearsh` to npm.

## Environment Variables

Web app requires in `apps/web/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
