# Gear Detail Page Enrichment & Visibility Design Spec

**Date**: 2026-03-30
**Status**: Approved
**Depends on**: 2026-03-30-gear-mvp-design.md (MVP must be implemented first)

Two features that enhance the Gear MVP: (1) a rich, visual detail page that breaks gearfiles into browsable sections with external metadata, and (2) public/private visibility controls for gears.

---

## 1. Database Changes

### 1.1 New Columns on `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN audit_results JSONB,
  ADD COLUMN plugin_metadata JSONB;
```

### 1.2 `is_public`

- `true` by default — all existing and new gears are public unless explicitly set private.
- Private gears are only visible to their owner. They do not appear in search, homepage leaderboard, or public API responses.

### 1.3 `audit_results`

JSON object stored at publish time. Shape:

```typescript
interface AuditResults {
  secrets_scan: "pass" | "fail";
  verified_sources: "pass" | "warn";
  path_scrubbing: "pass" | "fail";
  unknown_plugins: {
    status: "pass" | "warn";
    details: string[]; // e.g. ["autodev from 1h0m4s-marketplace"]
  };
}
```

**Audit definitions:**

| Check | PASS | WARN | FAIL |
|-------|------|------|------|
| `secrets_scan` | No secrets detected in gearfile content | — | Potential secrets found (should not happen — CLI blocks publish, but server validates too) |
| `verified_sources` | All plugins/skills from known marketplaces (`claude-plugins-official`, `superpowers-marketplace`) | Plugins from unknown marketplaces present | — |
| `path_scrubbing` | No absolute paths (e.g., `/Users/...`, `C:\...`) found in content | — | Absolute paths detected |
| `unknown_plugins` | All plugins resolvable to a known source | Some plugins from unverified marketplaces | — |

Audits are computed server-side in the `profile.publish` tRPC mutation, before saving.

### 1.4 `plugin_metadata`

JSON array stored at publish time. Shape:

```typescript
interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  skills_sh_url: string | null;
}
```

For each plugin in the gearfile, the publish mutation attempts to:
1. Resolve a skills.sh URL by constructing `https://skills.sh/skills/<marketplace>/<name>` and checking if it exists (HEAD request, best-effort)
2. Resolve a GitHub repo and fetch star count from `https://api.github.com/repos/<owner>/<repo>` (best-effort)

If either lookup fails, the field is `null`. Publish does not fail due to metadata fetch failures.

### 1.5 RLS Updates

```sql
-- Replace the existing SELECT policy on profiles
DROP POLICY "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Owners can view own profiles"
  ON profiles FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::text));
```

Note: The tRPC API uses the service role (admin) client, so RLS does not apply to API queries. Visibility filtering is enforced in the tRPC router logic instead. These RLS policies are defense-in-depth for any direct Supabase client access.

---

## 2. API Changes

### 2.1 `profile.publish` — Enhanced

The existing publish mutation gains these steps after saving the gearfile:

1. **Run audits** on the gearfile content string:
   - Secrets scan: reuse `detectSecrets()` from CLI sanitizer (extract to shared package or reimplement server-side)
   - Path scrubbing: regex check for absolute paths (`/Users/`, `/home/`, `C:\`)
   - Verified sources: check each plugin's marketplace against a known-good list
   - Unknown plugins: flag any from unverified marketplaces
2. **Fetch plugin metadata** for each plugin in the gearfile (best-effort, parallel, with timeout)
3. **Store** `audit_results` and `plugin_metadata` in the profile row

New input field: `is_public?: boolean` (defaults to `true`).

### 2.2 `profile.get` — Visibility Enforced

Currently returns any profile by username+slug. Add visibility check:
- If `is_public = true`: return to anyone
- If `is_public = false`: return only if the requesting user is the owner
- Otherwise: return 404 (not 403 — don't leak existence)

### 2.3 `profile.search` and `profile.list` — Filter Private

Add `.eq("is_public", true)` to all search/list queries. Exception: if the user is authenticated, also include their own private gears in results (marked with a visibility indicator).

### 2.4 `profile.toggleVisibility` — New Mutation

```typescript
toggleVisibility: authedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Verify ownership, toggle is_public, return new value
  })
```

### 2.5 `profile.listOwn` — New Query

```typescript
listOwn: authedProcedure.query(async ({ ctx }) => {
  // Return all profiles owned by ctx.user, including private ones
  // Used by settings page "My Gears" section
})
```

---

## 3. Detail Page — Two-Column Layout

### 3.1 Page Structure

```
┌──────────────────────────────────────────────────┐
│ Nav                                              │
├────────────────────────────┬─────────────────────┤
│ LEFT COLUMN                │ RIGHT SIDEBAR       │
│                            │                     │
│ ┌─ Header ──────────────┐  │ Total Installs      │
│ │ Avatar  Name           │  │ 0                   │
│ │         @user/slug     │  │                     │
│ └────────────────────────┘  │ Compatibility       │
│                            │ [Claude] [Gemini]   │
│ ┌─ Install Command ─────┐  │                     │
│ │ $ gear switch @u/s  [⎘]│  │ Security Audits     │
│ └────────────────────────┘  │ Secrets scan  PASS  │
│                            │ Verified src  PASS  │
│ ┌─ Summary ──────────────┐  │ Path scrub    PASS  │
│ │ Description text...    │  │ Unknown plg   WARN  │
│ └────────────────────────┘  │ (1 unverified...)   │
│                            │                     │
│ PLUGINS (24)               │ Visibility          │
│ ├─ superpowers    ★12.2K ↗│  │ ● Public [toggle]  │
│ ├─ context7       ★8.4K  ↗│  │                     │
│ ├─ episodic-mem   ★2.1K  ↗│  │ Version             │
│ ├─ atlassian      ★5.7K  ↗│  │ 1.0.0               │
│ └─ + 20 more              │                     │
│                            │ Published           │
│ SKILLS (9)                 │ Mar 30, 2026        │
│ [web-design↗] [rag↗]      │                     │
│ [superdesign↗] [find↗]    │ Tags                │
│ [chunking] [embedding]    │ [claude-code]       │
│                            │ [full-stack] [mcp]  │
│ MCP SERVERS (0)            │                     │
│ No MCP servers configured  │ Model               │
│                            │ claude-sonnet-4-6   │
│ INSTRUCTIONS               │                     │
│ ┌────────────────────────┐  │                     │
│ │ @RTK.md                │  │                     │
│ └────────────────────────┘  │                     │
│                            │                     │
│ ▶ Raw Gearfile (collapsed) │                     │
└────────────────────────────┴─────────────────────┘
```

### 3.2 Left Column Components

**Header**: Avatar (from user), gear name (h1), `@username/slug` monospace.

**Install command**: Dark box with `$ gear switch @user/slug` and copy icon. Same style as homepage.

**Summary box**: Bordered card with `SUMMARY` label and description text.

**Plugins section**: Section label `PLUGINS (N)` with count. Each row is a link:
- Left: plugin name (bold) + marketplace (dimmed)
- Right: `★ 12.2K` GitHub stars (if available) + `skills.sh ↗` link badge (if `skills_sh_url` is non-null)
- Show first 5 by default, `+ N more` expander reveals rest
- Rows without metadata show name + marketplace only, no stars/link

**Skills section**: Section label `SKILLS (N)`. Compact pill tags. Pills with `skills_sh_url` get an `↗` suffix linking out. Others are plain text.

**MCP Servers section**: Section label `MCP SERVERS (N)`. Each row: server name, package, runtime. If empty: "No MCP servers configured".

**Instructions**: Section label `INSTRUCTIONS`. Rendered in a monospace code block.

**Raw Gearfile**: Collapsible `<details>` element, collapsed by default. Shows the full YAML+markdown content. Label: `▶ Raw Gearfile`.

### 3.3 Right Sidebar Components

**Total Installs**: Large number, monospace. Label `TOTAL INSTALLS`.

**Compatibility**: Agent icons (using existing `icons.tsx` components) with labels.

**Security Audits**: Label `SECURITY AUDITS`. Each audit check as a row: check name on left, PASS (green) / WARN (amber) / FAIL (red) badge on right. Below the badges: a context line if any warnings (e.g., "1 plugin from unverified marketplace (1h0m4s-marketplace)").

**Visibility**: Label `VISIBILITY`. Green dot + "Public" or orange dot + "Private". If the viewer is the owner: show a toggle switch to flip visibility. Non-owners see status only.

**Version**: From gearfile frontmatter.

**Published**: `created_at` formatted as human-readable date.

**Tags**: Compact pills, same style as homepage.

**Model**: From gearfile `overrides` if present.

### 3.4 Owner vs Visitor View

- **Owner** sees: visibility toggle (clickable), edit metadata link (future)
- **Visitor** sees: visibility status (read-only), no toggle

Owner detection: compare `ctx.user.id` to `profile.user_id` in the page's server component.

---

## 4. Settings Page — My Gears Section

### 4.1 Layout

Add a "My Gears" section above the existing "CLI Tokens" section:

```
MY GEARS

┌─────────────────────────────────────────────────┐
│ Thomas's Power Setup  @thomasindrias/power-setup│
│ ● Public  [toggle]              0 installs  →  │
├─────────────────────────────────────────────────┤
│ Private Dev Config    @thomasindrias/dev-private│
│ ● Private [toggle]             12 installs  →  │
└─────────────────────────────────────────────────┘
```

Each row:
- Gear name + slug
- Visibility toggle (inline, same as detail page)
- Install count
- Arrow link to detail page

Uses `profile.listOwn` query. Shows "No gears published yet" empty state with `gear push` hint.

---

## 5. CLI Changes

### 5.1 `gear push --private`

New flag: `--private` / `-p`. Sets `is_public: false` on publish. Default remains public.

```bash
gear push --name "My Setup" --slug "my-setup" --private -y
```

---

## 6. File Structure

New/modified files:

```
apps/web/
├── server/
│   ├── routers/profile.ts          # MODIFY: add visibility filtering, toggleVisibility, listOwn, audit logic
│   └── lib/
│       ├── auditor.ts              # CREATE: server-side audit checks
│       └── plugin-enricher.ts      # CREATE: skills.sh/GitHub metadata fetcher
├── app/
│   ├── (profiles)/[username]/[slug]/
│   │   └── page.tsx                # REWRITE: two-column layout with sections
│   ├── components/
│   │   ├── plugin-list.tsx         # CREATE: expandable plugin list with stars/links
│   │   ├── skill-pills.tsx         # CREATE: skill tags with optional external links
│   │   ├── audit-badges.tsx        # CREATE: PASS/WARN/FAIL badge component
│   │   ├── visibility-toggle.tsx   # CREATE: client component for toggling is_public
│   │   ├── raw-gearfile.tsx        # CREATE: collapsible raw content viewer
│   │   └── gear-list.tsx           # CREATE: settings page gear list with toggles
│   └── settings/
│       └── page.tsx                # MODIFY: add My Gears section above tokens
packages/db/
└── supabase/migrations/
    └── 00002_visibility_and_metadata.sql  # CREATE: migration for new columns + RLS
packages/cli/
└── src/commands/push.ts            # MODIFY: add --private flag
```

---

## 7. Testing Strategy

All features built with TDD:

- **Auditor**: Unit tests for each check (secrets detected → fail, clean content → pass, unknown marketplace → warn)
- **Plugin enricher**: Unit tests with mocked HTTP responses (skills.sh found → URL returned, 404 → null, timeout → null)
- **Visibility**: Integration tests — private gear not returned in search, returned to owner, 404 for non-owner
- **Toggle**: Test mutation flips `is_public`, verify state change
- **Detail page components**: Verify plugins render with stars when metadata exists, without when null. Verify audit badges show correct colors.
