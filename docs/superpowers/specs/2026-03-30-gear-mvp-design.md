# Gear MVP Design Spec

**Date**: 2026-03-30
**Status**: Approved

Gear is a platform + CLI for developers to share, discover, install, and hot-swap AI agent configurations. Think Docker Hub meets nvm, but for agentic environments. The platform is called **Gear**, hosted at `gear.sh` or `gear.dev`.

---

## 1. Core Concepts

### 1.1 The Problem

AI agent setups are complex (plugins, MCP servers, skills, hooks, system prompts, env vars) and impossible to share. A developer with a perfectly tuned Claude Code environment can't hand it to a teammate or the community without manually walking them through every config file.

### 1.2 The Solution

Gear provides:
- A **universal manifest format** (the Gearfile) that describes an agent setup in a platform-agnostic way
- A **CLI** (`gear`) that can scan a local setup, sanitize it, publish it, and hot-swap between published profiles
- A **web registry** (`gear.sh`) where developers browse, search, and discover community-shared agent setups

### 1.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model | Recipe (not bundle) | Like `package.json` -- lists dependencies, doesn't ship `node_modules`. No hosting user code on our servers. |
| MVP platforms | Claude Code + Gemini CLI | Proves the agnostic thesis with two structurally different platforms. Forces correct abstraction from day one. |
| Web scope | Browse-only + download counter | Developers author in their terminal, not in a browser. Keep the website as a storefront. |
| CLI auth | Personal Access Token | Generate on website, paste into `gear login`. Industry standard (npm, PyPI). No OAuth device flow complexity. |
| Storage model | Gearfile is source of truth, DB is search index | Like npm/crates.io. The Gearfile text blob is canonical. DB indexes metadata fields for search/filter. |
| Backend architecture | tRPC inside Next.js (T3 pattern) | Single deployment to Vercel. End-to-end type safety. CLI and frontend share the same router. |
| Auth provider | Supabase Auth | Already using Supabase for DB. GitHub OAuth built-in. One fewer external service. |
| Sanitization | Local-first | CLI strips secrets locally before upload. Nothing sensitive touches the server. |
| Profile switching | Global only (MVP) | `gear switch` modifies `~/.claude/` or `~/.gemini/`. Project-level switching is v2. |

---

## 2. The Gearfile Schema

The Gearfile is a Markdown file with YAML frontmatter. Machine-readable metadata in the frontmatter, human-readable documentation in the body.

```yaml
---
name: "Fullstack Next.js Expert"
slug: "fullstack-nextjs"
description: "Next.js 15, Supabase, Tailwind. App Router only."
version: "1.0.0"
compatibility: ["claude-code", "gemini-cli"]
tags: ["frontend", "react", "supabase", "nextjs"]

instructions: |
  You are a senior fullstack engineer specializing in
  Next.js 15 with App Router. Always use server components
  by default. Use Tailwind CSS for styling.

env_required:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - GITHUB_TOKEN

mcp_servers:
  - name: "postgres"
    runtime: "node"
    package: "@modelcontextprotocol/server-postgres"
    args: ["<SUPABASE_URL>"]
  - name: "github"
    runtime: "node"
    package: "@modelcontextprotocol/server-github"
    env:
      GITHUB_TOKEN: "<GITHUB_TOKEN>"

plugins:
  - name: "superpowers"
    marketplace: "claude-plugins-official"
  - name: "context7"
    marketplace: "claude-plugins-official"

skills:
  - name: "web-design-guidelines"
    source: "marketplace"
  - name: "custom-react-patterns"
    source: "https://gist.github.com/user/abc123"

custom_assets:
  - name: "pre-commit-hook"
    type: "hook"
    source: "https://gist.github.com/user/def456"

overrides:
  claude-code:
    model: "claude-sonnet-4-6"
  gemini-cli:
    model: "gemini-2.5-pro"
---

## About This Gear

A battle-tested setup for building production Next.js apps
with Supabase. Includes Postgres MCP for direct database
queries and GitHub integration for PR workflows.

## Setup Notes

You'll need a Supabase project. Run `supabase start`
for local dev.
```

### 2.1 Schema Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable display name |
| `slug` | Yes | URL-safe identifier. Used in `@username/slug` |
| `description` | Yes | One-line summary for search results and cards |
| `version` | Yes | Semver string |
| `compatibility` | Yes | Array of supported platforms: `claude-code`, `gemini-cli` |
| `tags` | Yes | Array of lowercase tags for filtering |
| `instructions` | No | System prompt / persona. Maps to CLAUDE.md or GEMINI.md |
| `env_required` | No | Array of env var names (never values) the user must provide |
| `mcp_servers` | No | Array of MCP server definitions |
| `mcp_servers[].name` | Yes | Identifier for the server |
| `mcp_servers[].runtime` | Yes | `node` \| `python` \| `go`. Tells adapter which runner to use (`npx`, `uvx`, etc.) |
| `mcp_servers[].package` | Yes | Package name to install/run |
| `mcp_servers[].args` | No | Array of CLI arguments. May contain `<ENV_VAR>` placeholders |
| `mcp_servers[].env` | No | Key-value env vars for this server. Values may be `<ENV_VAR>` placeholders |
| `plugins` | No | Array of marketplace plugin references |
| `plugins[].name` | Yes | Plugin identifier |
| `plugins[].marketplace` | Yes | Marketplace source (e.g., `claude-plugins-official`) |
| `skills` | No | Array of skill references |
| `skills[].name` | Yes | Skill identifier |
| `skills[].source` | Yes | `marketplace` or a URL to fetch from |
| `custom_assets` | No | Array of remote file references |
| `custom_assets[].name` | Yes | Identifier |
| `custom_assets[].type` | Yes | `hook` \| `skill` \| `script`. Adapter decides target path based on type |
| `custom_assets[].source` | Yes | URL to fetch the file from (GitHub gist, raw repo link) |
| `overrides` | No | Platform-keyed object. Raw config merged into the platform's settings file |

---

## 3. Tech Stack

### 3.1 Monorepo Structure

```
gear/
├── apps/
│   └── web/                    # Next.js 15 App Router
│       ├── app/                # Pages (/, /@[username]/[slug], /settings)
│       ├── server/             # tRPC router and procedures
│       │   ├── routers/
│       │   │   ├── profile.ts  # publish, get, search, incrementDownload
│       │   │   ├── token.ts    # create, revoke, list
│       │   │   └── user.ts     # getMe, getByUsername
│       │   ├── trpc.ts         # tRPC init, context, middleware
│       │   └── root.ts         # Root router (merges sub-routers)
│       └── lib/
│           └── supabase.ts     # Supabase client setup
├── packages/
│   ├── cli/                    # The `gear` CLI
│   │   └── src/
│   │       ├── commands/       # login, push, switch, list, stash, restore
│   │       ├── adapters/       # claude-code.ts, gemini-cli.ts
│   │       ├── sanitizer.ts    # Local secret/path scrubbing
│   │       └── index.ts        # Commander.js entry point
│   ├── db/                     # Supabase client, migrations, types
│   └── shared/                 # Gearfile Zod schema, shared types
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 3.2 Technology Choices

| Layer | Technology | Notes |
|-------|-----------|-------|
| Database | Supabase (PostgreSQL) | Hosted Postgres with JS client |
| Auth | Supabase Auth | GitHub OAuth provider |
| Frontend | Next.js 15 App Router | SSR pages, Tailwind CSS, shadcn/ui |
| API | tRPC v11 | Hosted in Next.js via `/api/trpc/[trpc]` route |
| Validation | Zod | Shared schemas between CLI, server, and frontend |
| CLI runtime | Node.js (TypeScript) | Commander.js for commands, `prompts` for interactivity |
| CLI HTTP | `@trpc/client` | Type-safe API calls to the tRPC router |
| Package manager | pnpm workspaces | With Turborepo for build orchestration |
| Hosting | Vercel | Single deployment for Next.js + tRPC |
| Animations | Framer Motion | Card hover effects, page transitions |
| Markdown rendering | `react-markdown` + `rehype-raw` + Shiki | For Gearfile display on profile pages |

---

## 4. Database Schema

Three tables in Supabase PostgreSQL:

### 4.1 `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `supabase_auth_id` | text | UNIQUE, NOT NULL. Links to Supabase Auth user |
| `username` | text | UNIQUE, NOT NULL. Used in `@username/slug` URLs |
| `avatar_url` | text | Nullable. Pulled from GitHub profile |
| `created_at` | timestamptz | default `now()` |

### 4.2 `cli_tokens`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK -> `users.id`, NOT NULL |
| `token_hash` | text | UNIQUE, NOT NULL. SHA-256 hash of the PAT |
| `name` | text | NOT NULL. User-provided label (e.g., "MacBook Pro") |
| `last_used_at` | timestamptz | Nullable |
| `created_at` | timestamptz | default `now()` |

### 4.3 `profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK -> `users.id`, NOT NULL |
| `slug` | text | NOT NULL |
| `name` | text | NOT NULL |
| `description` | text | NOT NULL |
| `tags` | text[] | NOT NULL, default `'{}'` |
| `compatibility` | text[] | NOT NULL, default `'{}'` |
| `gearfile_content` | text | NOT NULL. The full Gearfile markdown |
| `downloads_count` | integer | NOT NULL, default `0` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

**Constraints**: `UNIQUE(user_id, slug)`

**Indexes**: GIN index on `tags` and `compatibility` for array containment queries. Full-text search index on `name` and `description` using `tsvector`.

---

## 5. tRPC Router

### 5.1 Procedures

**Profile Router** (`server/routers/profile.ts`):

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `profile.publish` | Mutation | PAT (CLI) | Upserts a profile. Input: Gearfile content + extracted metadata. Validates with Zod schema. |
| `profile.get` | Query | Public | Returns profile by `username` + `slug`. Includes author info. |
| `profile.download` | Query | Public | Returns raw `gearfile_content` and increments `downloads_count`. Used by CLI. |
| `profile.search` | Query | Public | Full-text search on name/description. Filters by `tags[]` and `compatibility[]`. Pagination via cursor. |
| `profile.list` | Query | Public | Lists profiles. Sortable by `downloads_count`, `created_at`. Pagination. |
| `profile.delete` | Mutation | PAT (CLI) or Session | Deletes a profile owned by the authenticated user. |

**Token Router** (`server/routers/token.ts`):

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `token.create` | Mutation | Session (web) | Generates a PAT, stores SHA-256 hash, returns plaintext once. |
| `token.list` | Query | Session (web) | Lists user's tokens (name, last_used_at, created_at). No hash exposed. |
| `token.revoke` | Mutation | Session (web) | Deletes a token by ID. |

**User Router** (`server/routers/user.ts`):

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `user.me` | Query | Session (web) | Returns the authenticated user's profile. |
| `user.getByUsername` | Query | Public | Returns user info + their published profiles. |

### 5.2 Auth Middleware

Two auth strategies sharing the same tRPC context:

1. **Session auth** (web): Supabase Auth session cookie. Used by the frontend and `/settings` page.
2. **PAT auth** (CLI): Bearer token in `Authorization` header. The middleware hashes the token, looks up `cli_tokens`, resolves the `user_id`. Updates `last_used_at`.

The tRPC context builder checks for both and populates `ctx.user` if either succeeds.

---

## 6. CLI Architecture

### 6.1 Commands

| Command | Description |
|---------|-------------|
| `gear login <token>` | Stores PAT in `~/.gear/config.json`. Optionally set `--platform claude-code\|gemini-cli` (auto-detected if omitted). |
| `gear push` | Scans local agent setup, runs sanitizer, generates Gearfile, POSTs via tRPC `profile.publish`. |
| `gear push --dry-run` | Runs scan + sanitize, prints generated Gearfile to stdout. No network call. |
| `gear switch @user/slug` | Downloads Gearfile via tRPC `profile.download`, stashes current config, prompts for env vars, applies via platform adapter. |
| `gear switch @user/slug --platform <p>` | Override auto-detected platform for this switch. |
| `gear list` | Lists installed profiles in `~/.gear/profiles/`. Active profile marked with star. |
| `gear stash` | Snapshots current platform config to `~/.gear/stash/<ISO-timestamp>/`. |
| `gear restore` | Restores the most recent stash. |

### 6.2 Local File Structure

```
~/.gear/
  config.json             # { "token": "gear_pat_...", "platform": "claude-code" } (chmod 600)
  profiles/
    devninja--fullstack-nextjs/
      Gearfile.md          # Downloaded from registry
      assets/              # Downloaded custom_assets
    sarah--data-science/
      Gearfile.md
      assets/
  stash/
    2026-03-30T14-00-00/
      settings.json.bak    # Backup of platform settings
      CLAUDE.md.bak         # Backup of instructions file
  active                   # Text file containing current profile slug
```

### 6.3 Adapter Interface

Each platform adapter implements:

```typescript
interface PlatformAdapter {
  name: string;                          // "claude-code" | "gemini-cli"
  detect(): boolean;                     // Can this platform be found locally?
  getConfigPaths(): ConfigPaths;         // Where are settings, instructions, etc.?
  stash(stashDir: string): Promise<void>;        // Backup current state
  restore(stashDir: string): Promise<void>;      // Restore from backup
  apply(gearfile: Gearfile, envVars: Record<string, string>): Promise<void>;  // Apply the gear
}
```

### 6.4 Adapter Order of Operations (`gear switch`)

1. Download Gearfile from registry (tRPC `profile.download`)
2. Auto-detect platform (or use `--platform` override)
3. Stash current local config via adapter
4. Read `env_required` from Gearfile, prompt user for any missing values
5. Write `instructions` to platform's instructions file (CLAUDE.md / GEMINI.md)
6. Merge `mcp_servers` into platform's settings.json (substituting `<ENV_VAR>` placeholders with collected values)
7. Install `plugins` via marketplace references (skip unsupported platforms with log warning)
8. Download `custom_assets` to platform-appropriate directories (adapter maps `type` to path)
9. Merge `overrides` for active platform into settings.json
10. Write `active` file with current profile slug

### 6.5 Claude Code Adapter Specifics

| Gearfile Concept | Claude Code Target |
|------------------|--------------------|
| `instructions` | `~/.claude/CLAUDE.md` (global) |
| `mcp_servers` | `~/.claude/settings.json` -> `mcpServers` |
| `plugins` | `~/.claude/settings.json` -> `enabledPlugins` (by marketplace ref) |
| `skills` (marketplace) | `~/.claude/skills/` (symlink or install) |
| `skills` (URL) | Download to `~/.claude/skills/<name>/` |
| `custom_assets` type `hook` | `~/.claude/hooks/` |
| `custom_assets` type `script` | `~/.claude/scripts/` |
| `overrides.claude-code` | Merged into `~/.claude/settings.json` |
| `runtime: node` | Uses `npx -y <package>` |
| `runtime: python` | Uses `uvx <package>` |

### 6.6 Gemini CLI Adapter Specifics

| Gearfile Concept | Gemini CLI Target |
|------------------|-------------------|
| `instructions` | `~/.gemini/GEMINI.md` (global) |
| `mcp_servers` | `~/.gemini/settings.json` -> `mcpServers` |
| `plugins` | Skipped (not supported). Log warning. |
| `skills` | Skipped (not supported). Log warning. |
| `custom_assets` type `hook` | Skipped (not supported). Log warning. |
| `custom_assets` type `script` | Download to `~/.gemini/scripts/` |
| `overrides.gemini-cli` | Merged into `~/.gemini/settings.json` |
| `runtime: node` | Uses `npx -y <package>` |
| `runtime: python` | Uses `uvx <package>` |

---

## 7. Sanitizer Logic (`gear push`)

The sanitizer runs entirely on the user's local machine before any data is transmitted.

### 7.1 Scanner Entry Points

The `gear push` scanner reads platform-specific files to build the Gearfile:

**Claude Code**:
- `~/.claude/settings.json` -- MCP servers, enabled plugins, env vars, hooks, model
- `~/.claude/plugins/installed_plugins.json` -- Plugin names, marketplaces, versions
- `~/.claude/skills/` -- Skill names (symlink targets for marketplace, directory names for custom)
- `~/.claude/CLAUDE.md` -- Global instructions (if exists)
- `~/.claude/hooks/` -- Custom hook scripts (converted to `custom_assets` with remote source prompt)

**Gemini CLI**:
- `~/.gemini/settings.json` -- MCP servers, model config
- `~/.gemini/GEMINI.md` -- Global instructions (if exists)

For custom scripts/hooks that are local files (not from a marketplace), the scanner prompts the user to provide a public URL (GitHub gist, raw repo link) so others can fetch them. If no URL is provided, the asset is excluded from the Gearfile with a warning.

### 7.2 Path Scrubbing

Replace patterns matching local absolute paths with `<USER_HOME>`:
- `/Users/<username>/...` (macOS)
- `/home/<username>/...` (Linux)
- `C:\Users\<username>\...` (Windows)

### 7.3 Secret Detection

Regex patterns for common secret formats:
- `sk-[a-zA-Z0-9]{20,}` (OpenAI/Anthropic API keys)
- `xoxp-`, `xoxb-` (Slack tokens)
- `ghp_`, `ghs_`, `ghr_` (GitHub tokens)
- `glpat-` (GitLab tokens)
- `AKIA[A-Z0-9]{16}` (AWS access keys)
- `sbp_` (Supabase tokens)
- Base64 blobs > 40 chars appearing as JSON values

Also flag any JSON key containing `password`, `secret`, `token`, `key`, `credential` where the value is non-empty.

### 7.4 Env Extraction

Scan the platform's settings for env-like values:
- Extract variable names to `env_required`
- Replace actual values with `<VAR_NAME>` placeholders in the Gearfile

### 7.5 Interactive Confirmation

After sanitization completes:
1. Print a summary of all redacted items (count of paths replaced, secrets found, env vars extracted)
2. Print the full generated Gearfile to stdout
3. Prompt: "Does this look safe to publish? (y/n)"
4. `--dry-run` flag stops after step 2 (no prompt, no upload)

---

## 8. Web Application

### 8.1 Pages

**Landing Page (`/`)**
- Hero section with `npm i -g gear-cli` install command
- Search bar with tag filters (`#claude-code`, `#gemini-cli`, `#frontend`, `#backend`, etc.)
- Grid of profile cards: author avatar, name, description, compatibility badges, download count, "copy install command" on hover
- Sorted by: trending (downloads/time), recent, most downloaded

**Profile Page (`/@[username]/[slug]`)**
- "Copy Install Command" button prominent: `gear switch @username/slug`
- Download counter
- Compatibility badges (amber for Claude, blue for Gemini)
- Rendered Gearfile markdown with syntax-highlighted YAML frontmatter
- Author card with avatar and link to their other gears

**Settings Page (`/settings`)** (authenticated)
- Generate new CLI token (shown once, then only hash stored)
- List existing tokens (name, last used, created date)
- Revoke tokens

### 8.2 Design Language

- Dark theme base
- Neon accent colors (think skills.sh aesthetic)
- Platform-specific badge colors: amber/orange for Claude Code, blue for Gemini CLI
- Monospace code blocks for Gearfile rendering (Shiki syntax highlighting)
- Framer Motion for card hover effects and page transitions
- shadcn/ui components throughout

---

## 9. CLI Distribution

- Published as `gear-cli` on npm: `npm i -g gear-cli`
- Binary name: `gear`
- Minimum Node.js: 18+ (for native `fetch`)
- The CLI package imports tRPC `AppRouter` type from the shared workspace for end-to-end type safety

---

## 10. Out of Scope (MVP)

- Web-based Gearfile editor
- Comments, stars, or social features beyond download count
- Private or team profiles
- Version history (only latest version stored per profile)
- `gear eject` / factory reset command
- Project-level `gear switch --local`
- Platforms beyond Claude Code and Gemini CLI
- OAuth device flow for CLI authentication
- Bundling user code (custom scripts hosted by Gear)
- Profile forking or cloning on the website
- Rate limiting or abuse prevention (add before public launch)
- Email notifications

---

## 11. Future Considerations (v2+)

- `gear switch --local` for project-level config (drops Gearfile into CWD)
- `gear eject` to return platform to factory defaults
- Profile versioning with changelog
- Additional platform adapters (Cursor, Windsurf, Cline)
- Private/team profiles with access control
- Profile forking (clone someone's gear as a starting point)
- OAuth device flow for smoother CLI login
- A `gear` MCP server / agent skill so users can publish from within their agent
- Community features: stars, comments, curated collections
