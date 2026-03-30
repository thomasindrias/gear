# Gear Detail Page Enrichment & Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the gear detail page with visual plugin/skill sections, add security audit badges, and implement public/private visibility controls.

**Architecture:** DB migration adds `is_public`, `audit_results`, `plugin_metadata` columns to `profiles`. Server-side `auditor.ts` and `plugin-enricher.ts` run at publish time. Detail page is rewritten as two-column layout with dedicated client components. Visibility toggle available on detail page (owner only) and settings page.

**Tech Stack:** Next.js 15, tRPC v11, Supabase (Postgres + service role), Zod, Tailwind CSS v4, Vitest

---

### Task 1: Database Migration

**Files:**
- Create: `packages/db/supabase/migrations/00002_visibility_and_metadata.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add visibility and metadata columns
ALTER TABLE profiles
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN audit_results JSONB,
  ADD COLUMN plugin_metadata JSONB;

-- Replace SELECT policy with visibility-aware policies
DROP POLICY "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Owners can view own profiles"
  ON profiles FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::text));
```

- [ ] **Step 2: Apply the migration**

```bash
cp packages/db/supabase/migrations/00002_visibility_and_metadata.sql supabase/migrations/00002_visibility_and_metadata.sql
supabase db push
```

Expected: Migration applied successfully.

- [ ] **Step 3: Verify columns exist**

```bash
supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('is_public', 'audit_results', 'plugin_metadata');"
```

Expected: 3 rows returned.

- [ ] **Step 4: Commit**

```bash
git add packages/db/supabase/migrations/00002_visibility_and_metadata.sql supabase/migrations/00002_visibility_and_metadata.sql
git commit -m "feat(db): add visibility and metadata columns to profiles"
```

---

### Task 2: Server-Side Auditor

**Files:**
- Create: `apps/web/server/lib/auditor.ts`
- Create: `apps/web/server/lib/auditor.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/server/lib/auditor.test.ts
import { describe, it, expect } from "vitest";
import { runAudits } from "./auditor";

describe("runAudits", () => {
  it("passes all checks for clean content", () => {
    const content = `---
name: Test Gear
plugins:
  - name: superpowers
    marketplace: claude-plugins-official
---
Clean content here.`;

    const plugins = [{ name: "superpowers", marketplace: "claude-plugins-official" }];
    const result = runAudits(content, plugins);

    expect(result.secrets_scan).toBe("pass");
    expect(result.path_scrubbing).toBe("pass");
    expect(result.verified_sources).toBe("pass");
    expect(result.unknown_plugins.status).toBe("pass");
    expect(result.unknown_plugins.details).toEqual([]);
  });

  it("fails secrets_scan when API key is present", () => {
    const content = "---\nname: Test\n---\nsk-abc123456789012345678901234567890";
    const result = runAudits(content, []);
    expect(result.secrets_scan).toBe("fail");
  });

  it("fails path_scrubbing when absolute paths are present", () => {
    const content = "---\nname: Test\n---\npath: /Users/john/projects/foo";
    const result = runAudits(content, []);
    expect(result.path_scrubbing).toBe("fail");
  });

  it("warns verified_sources for unknown marketplace", () => {
    const plugins = [
      { name: "superpowers", marketplace: "claude-plugins-official" },
      { name: "custom-thing", marketplace: "some-random-marketplace" },
    ];
    const result = runAudits("---\nname: Test\n---\nClean", plugins);
    expect(result.verified_sources).toBe("warn");
  });

  it("warns unknown_plugins with details", () => {
    const plugins = [
      { name: "autodev", marketplace: "1h0m4s-marketplace" },
    ];
    const result = runAudits("---\nname: Test\n---\nClean", plugins);
    expect(result.unknown_plugins.status).toBe("warn");
    expect(result.unknown_plugins.details).toEqual(["autodev from 1h0m4s-marketplace"]);
  });

  it("detects Windows paths", () => {
    const content = "---\nname: Test\n---\npath: C:\\Users\\john\\projects";
    const result = runAudits(content, []);
    expect(result.path_scrubbing).toBe("fail");
  });

  it("detects Linux home paths", () => {
    const content = "---\nname: Test\n---\npath: /home/john/.config/foo";
    const result = runAudits(content, []);
    expect(result.path_scrubbing).toBe("fail");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web exec vitest run server/lib/auditor.test.ts
```

Expected: FAIL — module `./auditor` not found.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/server/lib/auditor.ts

export interface AuditResults {
  secrets_scan: "pass" | "fail";
  verified_sources: "pass" | "warn";
  path_scrubbing: "pass" | "fail";
  unknown_plugins: {
    status: "pass" | "warn";
    details: string[];
  };
}

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /xoxp-[a-zA-Z0-9-]+/,
  /xoxb-[a-zA-Z0-9-]+/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /ghs_[a-zA-Z0-9]{36,}/,
  /ghr_[a-zA-Z0-9]{36,}/,
  /glpat-[a-zA-Z0-9_-]{20,}/,
  /AKIA[A-Z0-9]{16}/,
  /sbp_[a-zA-Z0-9]{20,}/,
];

const PATH_PATTERNS = [
  /\/Users\/[^/\s"']+/,
  /\/home\/[^/\s"']+/,
  /C:\\Users\\[^\\\s"']+/,
];

const VERIFIED_MARKETPLACES = new Set([
  "claude-plugins-official",
  "superpowers-marketplace",
]);

interface PluginInput {
  name: string;
  marketplace: string;
}

export function runAudits(content: string, plugins: PluginInput[]): AuditResults {
  const secrets_scan = SECRET_PATTERNS.some((p) => p.test(content)) ? "fail" : "pass";
  const path_scrubbing = PATH_PATTERNS.some((p) => p.test(content)) ? "fail" : "pass";

  const unverified = plugins.filter((p) => !VERIFIED_MARKETPLACES.has(p.marketplace));
  const verified_sources = unverified.length > 0 ? "warn" : "pass";

  const unknown_plugins = {
    status: unverified.length > 0 ? ("warn" as const) : ("pass" as const),
    details: unverified.map((p) => `${p.name} from ${p.marketplace}`),
  };

  return { secrets_scan, verified_sources, path_scrubbing, unknown_plugins };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web exec vitest run server/lib/auditor.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/server/lib/auditor.ts apps/web/server/lib/auditor.test.ts
git commit -m "feat(web): add server-side gearfile auditor with tests"
```

---

### Task 3: Plugin Metadata Enricher

**Files:**
- Create: `apps/web/server/lib/plugin-enricher.ts`
- Create: `apps/web/server/lib/plugin-enricher.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/server/lib/plugin-enricher.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichPlugins, type PluginMeta } from "./plugin-enricher";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("enrichPlugins", () => {
  it("returns metadata with skills_sh_url when skills.sh responds 200", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await enrichPlugins([
      { name: "superpowers", marketplace: "claude-plugins-official" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("superpowers");
    expect(result[0].skills_sh_url).toBe(
      "https://skills.sh/skills/claude-plugins-official/superpowers",
    );
  });

  it("returns null skills_sh_url when skills.sh responds 404", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await enrichPlugins([
      { name: "unknown-plugin", marketplace: "some-marketplace" },
    ]);

    expect(result[0].skills_sh_url).toBeNull();
  });

  it("returns null skills_sh_url on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await enrichPlugins([
      { name: "superpowers", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].skills_sh_url).toBeNull();
    expect(result[0].github_stars).toBeNull();
  });

  it("handles empty plugin list", async () => {
    const result = await enrichPlugins([]);
    expect(result).toEqual([]);
  });

  it("enriches multiple plugins in parallel", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await enrichPlugins([
      { name: "a", marketplace: "claude-plugins-official" },
      { name: "b", marketplace: "superpowers-marketplace" },
    ]);

    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web exec vitest run server/lib/plugin-enricher.test.ts
```

Expected: FAIL — module `./plugin-enricher` not found.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/server/lib/plugin-enricher.ts

export interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  skills_sh_url: string | null;
}

interface PluginInput {
  name: string;
  marketplace: string;
}

const FETCH_TIMEOUT = 5000;

async function checkSkillsSh(
  name: string,
  marketplace: string,
): Promise<string | null> {
  const url = `https://skills.sh/skills/${marketplace}/${name}`;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

async function enrichOne(plugin: PluginInput): Promise<PluginMeta> {
  const skills_sh_url = await checkSkillsSh(plugin.name, plugin.marketplace);

  return {
    name: plugin.name,
    marketplace: plugin.marketplace,
    github_stars: null,
    skills_sh_url,
  };
}

export async function enrichPlugins(plugins: PluginInput[]): Promise<PluginMeta[]> {
  if (plugins.length === 0) return [];
  const results = await Promise.all(plugins.map(enrichOne));
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web exec vitest run server/lib/plugin-enricher.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/server/lib/plugin-enricher.ts apps/web/server/lib/plugin-enricher.test.ts
git commit -m "feat(web): add plugin metadata enricher with skills.sh lookup"
```

---

### Task 4: Enhanced Profile Router (publish, visibility, listOwn)

**Files:**
- Modify: `apps/web/server/routers/profile.ts`

- [ ] **Step 1: Update the publish mutation to run audits and enrich plugins**

Replace the `publish` mutation in `apps/web/server/routers/profile.ts`:

```typescript
import { z } from "zod";
import { router, publicProcedure, authedProcedure } from "../trpc";
import { runAudits } from "../lib/auditor";
import { enrichPlugins } from "../lib/plugin-enricher";
import { parseGearfile } from "@gear/shared";

const publishInput = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  compatibility: z.array(z.string()),
  gearfile_content: z.string(),
  is_public: z.boolean().default(true),
});

export const profileRouter = router({
  publish: authedProcedure.input(publishInput).mutation(async ({ ctx, input }) => {
    const match = input.gearfile_content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("Invalid Gearfile format");
    }

    // Extract plugins from gearfile for auditing/enrichment
    let plugins: { name: string; marketplace: string }[] = [];
    try {
      const parsed = parseGearfile(input.gearfile_content);
      plugins = parsed.frontmatter.plugins ?? [];
    } catch {
      // If parsing fails, proceed without plugin data
    }

    // Run audits
    const audit_results = runAudits(input.gearfile_content, plugins);

    // Enrich plugin metadata (best-effort, don't block on failure)
    let plugin_metadata = null;
    try {
      plugin_metadata = await enrichPlugins(plugins);
    } catch {
      // Enrichment failure is non-fatal
    }

    const { data, error } = await ctx.supabase
      .from("profiles")
      .upsert(
        {
          user_id: ctx.user.id,
          slug: input.slug,
          name: input.name,
          description: input.description,
          tags: input.tags,
          compatibility: input.compatibility,
          gearfile_content: input.gearfile_content,
          is_public: input.is_public,
          audit_results,
          plugin_metadata,
        },
        { onConflict: "user_id,slug" },
      )
      .select("id, slug")
      .single();

    if (error) throw error;
    return { id: data.id, slug: data.slug, username: ctx.user.username };
  }),
```

- [ ] **Step 2: Update `get` to enforce visibility**

```typescript
  get: publicProcedure
    .input(z.object({ username: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("*, users!inner(id, username, avatar_url)")
        .eq("slug", input.slug)
        .eq("users.username", input.username)
        .single();

      if (error || !data) {
        throw new Error("Profile not found");
      }

      // Private profiles only visible to owner
      if (!data.is_public) {
        if (!ctx.user || ctx.user.id !== data.users.id) {
          throw new Error("Profile not found");
        }
      }

      return data;
    }),
```

- [ ] **Step 3: Update `search` and `list` to filter private profiles**

In the `search` query, add after the `.limit()` call:

```typescript
      q = q.eq("is_public", true);
```

In the `list` query, add after the `.limit()` call:

```typescript
      q = q.eq("is_public", true);
```

- [ ] **Step 4: Add `toggleVisibility` mutation**

Add after the `delete` procedure:

```typescript
  toggleVisibility: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current state
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("id, is_public, user_id")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      const newValue = !profile.is_public;
      const { error } = await ctx.supabase
        .from("profiles")
        .update({ is_public: newValue })
        .eq("id", input.id);

      if (error) throw error;
      return { is_public: newValue };
    }),
```

- [ ] **Step 5: Add `listOwn` query**

Add after `toggleVisibility`:

```typescript
  listOwn: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("id, slug, name, is_public, downloads_count, created_at, users!inner(username)")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }),
```

- [ ] **Step 6: Verify the app compiles**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/server/routers/profile.ts
git commit -m "feat(web): add visibility controls, audits, and enrichment to profile router"
```

---

### Task 5: Audit Badges Component

**Files:**
- Create: `apps/web/app/components/audit-badges.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/web/app/components/audit-badges.tsx

interface AuditResults {
  secrets_scan: "pass" | "fail";
  verified_sources: "pass" | "warn";
  path_scrubbing: "pass" | "fail";
  unknown_plugins: {
    status: "pass" | "warn";
    details: string[];
  };
}

const STATUS_STYLES = {
  pass: "text-green-400 bg-green-400/10 border-green-400/20",
  warn: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  fail: "text-red-400 bg-red-400/10 border-red-400/20",
};

function Badge({ status }: { status: "pass" | "warn" | "fail" }) {
  return (
    <span
      className={`text-[10px] font-semibold font-mono px-2.5 py-0.5 rounded border ${STATUS_STYLES[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export function AuditBadges({ results }: { results: AuditResults | null }) {
  if (!results) return null;

  const checks = [
    { label: "Secrets scan", status: results.secrets_scan },
    { label: "Verified sources", status: results.verified_sources },
    { label: "Path scrubbing", status: results.path_scrubbing },
    { label: "Unknown plugins", status: results.unknown_plugins.status },
  ];

  const warnings = results.unknown_plugins.details;

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3">
        Security Audits
      </div>
      <div className="flex flex-col gap-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between"
          >
            <span className="text-xs text-neutral-400 font-mono">
              {check.label}
            </span>
            <Badge status={check.status} />
          </div>
        ))}
      </div>
      {warnings.length > 0 && (
        <p className="text-[10px] text-neutral-600 mt-2 leading-relaxed font-mono">
          {warnings.length} plugin{warnings.length > 1 ? "s" : ""} from
          unverified source{warnings.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/components/audit-badges.tsx
git commit -m "feat(web): add AuditBadges component"
```

---

### Task 6: Plugin List and Skill Pills Components

**Files:**
- Create: `apps/web/app/components/plugin-list.tsx`
- Create: `apps/web/app/components/skill-pills.tsx`

- [ ] **Step 1: Create PluginList component**

```typescript
// apps/web/app/components/plugin-list.tsx
"use client";

import { useState } from "react";

interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  skills_sh_url: string | null;
}

interface GearfilePlugin {
  name: string;
  marketplace: string;
}

function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function PluginList({
  plugins,
  metadata,
}: {
  plugins: GearfilePlugin[];
  metadata: PluginMeta[] | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_SHOW = 5;

  if (plugins.length === 0) {
    return (
      <div>
        <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
          Plugins (0)
        </div>
        <p className="text-xs text-neutral-600 font-mono">No plugins configured</p>
      </div>
    );
  }

  const metaMap = new Map(
    (metadata ?? []).map((m) => [`${m.name}:${m.marketplace}`, m]),
  );

  const visible = expanded ? plugins : plugins.slice(0, INITIAL_SHOW);
  const remaining = plugins.length - INITIAL_SHOW;

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
        Plugins ({plugins.length})
      </div>
      <div className="flex flex-col">
        {visible.map((plugin) => {
          const meta = metaMap.get(`${plugin.name}:${plugin.marketplace}`);
          return (
            <div
              key={`${plugin.name}:${plugin.marketplace}`}
              className="flex items-center justify-between py-2.5 px-1 border-b border-neutral-800/30 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-neutral-200">
                  {plugin.name}
                </span>
                <span className="text-xs text-neutral-600 font-mono">
                  {plugin.marketplace}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {meta?.github_stars != null && (
                  <span className="text-xs text-neutral-600 font-mono flex items-center gap-1">
                    ★ {formatStars(meta.github_stars)}
                  </span>
                )}
                {meta?.skills_sh_url ? (
                  <a
                    href={meta.skills_sh_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded font-mono hover:border-neutral-600 hover:text-neutral-300 transition"
                  >
                    skills.sh ↗
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-neutral-600 font-mono mt-2 hover:text-neutral-400 transition"
        >
          + {remaining} more plugin{remaining > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SkillPills component**

```typescript
// apps/web/app/components/skill-pills.tsx

interface Skill {
  name: string;
  source: string;
}

interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  skills_sh_url: string | null;
}

export function SkillPills({
  skills,
  pluginMeta,
}: {
  skills: Skill[];
  pluginMeta: PluginMeta[] | null;
}) {
  if (skills.length === 0) {
    return (
      <div>
        <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
          Skills (0)
        </div>
        <p className="text-xs text-neutral-600 font-mono">No skills configured</p>
      </div>
    );
  }

  // Try to match skills to plugin metadata for links
  const metaByName = new Map(
    (pluginMeta ?? []).map((m) => [m.name, m]),
  );

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
        Skills ({skills.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const meta = metaByName.get(skill.name);
          const url = meta?.skills_sh_url;

          if (url) {
            return (
              <a
                key={skill.name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 transition inline-flex items-center gap-1"
              >
                {skill.name}
                <span className="text-neutral-600 text-[10px]">↗</span>
              </a>
            );
          }

          return (
            <span
              key={skill.name}
              className="text-xs font-mono px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-500"
            >
              {skill.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/components/plugin-list.tsx apps/web/app/components/skill-pills.tsx
git commit -m "feat(web): add PluginList and SkillPills components"
```

---

### Task 7: Visibility Toggle and Raw Gearfile Components

**Files:**
- Create: `apps/web/app/components/visibility-toggle.tsx`
- Create: `apps/web/app/components/raw-gearfile.tsx`

- [ ] **Step 1: Create VisibilityToggle component**

```typescript
// apps/web/app/components/visibility-toggle.tsx
"use client";

import { useState } from "react";
import { trpc } from "~/lib/trpc-client";

export function VisibilityToggle({
  profileId,
  initialValue,
  isOwner,
}: {
  profileId: string;
  initialValue: boolean;
  isOwner: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const result = await trpc.profile.toggleVisibility.mutate({ id: profileId });
      setIsPublic(result.is_public);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
        Visibility
      </div>
      <div className="flex items-center gap-2">
        <span className={isPublic ? "text-green-400" : "text-amber-400"}>●</span>
        <span className="text-sm text-neutral-400 font-mono">
          {isPublic ? "Public" : "Private"}
        </span>
        {isOwner && (
          <button
            onClick={handleToggle}
            disabled={loading}
            className="text-[10px] text-neutral-600 hover:text-neutral-300 font-mono ml-1 transition disabled:opacity-50"
          >
            [{loading ? "..." : "toggle"}]
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create RawGearfile component**

```typescript
// apps/web/app/components/raw-gearfile.tsx
"use client";

export function RawGearfile({ content }: { content: string }) {
  return (
    <details className="group">
      <summary className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono cursor-pointer border-b border-neutral-800/50 pb-2 hover:text-neutral-400 transition select-none">
        <span className="group-open:hidden">▶</span>
        <span className="hidden group-open:inline">▼</span>
        {" "}Raw Gearfile
      </summary>
      <pre className="mt-3 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 text-xs font-mono text-neutral-500 overflow-x-auto">
        <code>{content}</code>
      </pre>
    </details>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/components/visibility-toggle.tsx apps/web/app/components/raw-gearfile.tsx
git commit -m "feat(web): add VisibilityToggle and RawGearfile components"
```

---

### Task 8: Rewrite Detail Page (Two-Column Layout)

**Files:**
- Modify: `apps/web/app/(profiles)/[username]/[slug]/page.tsx`

- [ ] **Step 1: Rewrite the detail page**

```typescript
// apps/web/app/(profiles)/[username]/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "~/lib/supabase-server";
import { createSupabaseSSR } from "~/lib/supabase-ssr";
import { Nav } from "~/app/components/nav";
import { CopyButton } from "~/app/components/copy-button";
import { PluginList } from "~/app/components/plugin-list";
import { SkillPills } from "~/app/components/skill-pills";
import { AuditBadges } from "~/app/components/audit-badges";
import { VisibilityToggle } from "~/app/components/visibility-toggle";
import { RawGearfile } from "~/app/components/raw-gearfile";
import { CompatibilityBadge } from "~/app/components/compatibility-badge";
import { parseGearfile } from "@gear/shared";

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { username, slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, users!inner(id, username, avatar_url)")
    .eq("slug", slug)
    .eq("users.username", username)
    .single();

  if (!profile) notFound();

  // Check visibility — private profiles only visible to owner
  const ssrClient = await createSupabaseSSR();
  const { data: { user: authUser } } = await ssrClient.auth.getUser();

  let currentUserId: string | null = null;
  if (authUser) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_auth_id", authUser.id)
      .single();
    currentUserId = dbUser?.id ?? null;
  }

  if (!profile.is_public && currentUserId !== profile.users.id) {
    notFound();
  }

  const isOwner = currentUserId === profile.users.id;
  const installCmd = `gear switch @${profile.users.username}/${profile.slug}`;

  // Parse gearfile for structured sections
  let plugins: { name: string; marketplace: string }[] = [];
  let skills: { name: string; source: string }[] = [];
  let mcpServers: { name: string; runtime: string; package: string }[] = [];
  let instructions: string | null = null;
  let version = "1.0.0";
  let model: string | null = null;

  try {
    const parsed = parseGearfile(profile.gearfile_content);
    plugins = parsed.frontmatter.plugins ?? [];
    skills = parsed.frontmatter.skills ?? [];
    mcpServers = (parsed.frontmatter.mcp_servers ?? []) as typeof mcpServers;
    instructions = parsed.frontmatter.instructions ?? null;
    version = parsed.frontmatter.version;
    if (parsed.frontmatter.overrides) {
      const claudeOverrides = parsed.frontmatter.overrides["claude-code"];
      if (claudeOverrides && typeof claudeOverrides === "object" && "model" in claudeOverrides) {
        model = claudeOverrides.model as string;
      }
    }
  } catch {
    // If parsing fails, show raw content only
  }

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-10 md:gap-12">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {profile.users.avatar_url && (
                  <img
                    src={profile.users.avatar_url}
                    alt={profile.users.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {profile.name}
                  </h1>
                  <span className="text-sm text-neutral-600 font-mono">
                    @{profile.users.username}/{profile.slug}
                  </span>
                </div>
              </div>
            </div>

            {/* Install command */}
            <div className="inline-flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-lg px-5 py-3">
              <code className="text-sm text-neutral-300 font-mono">
                <span className="text-neutral-600">$ </span>
                {installCmd}
              </code>
              <CopyButton text={installCmd} />
            </div>

            {/* Summary */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-5">
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                Summary
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {profile.description}
              </p>
            </div>

            {/* Plugins */}
            <PluginList plugins={plugins} metadata={profile.plugin_metadata} />

            {/* Skills */}
            <SkillPills skills={skills} pluginMeta={profile.plugin_metadata} />

            {/* MCP Servers */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
                MCP Servers ({mcpServers.length})
              </div>
              {mcpServers.length === 0 ? (
                <p className="text-xs text-neutral-600 font-mono">
                  No MCP servers configured
                </p>
              ) : (
                <div className="flex flex-col">
                  {mcpServers.map((server) => (
                    <div
                      key={server.name}
                      className="flex items-center justify-between py-2.5 px-1 border-b border-neutral-800/30"
                    >
                      <span className="text-sm font-semibold text-neutral-200">
                        {server.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-600 font-mono">
                          {server.package}
                        </span>
                        <span className="text-[10px] text-neutral-700 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">
                          {server.runtime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            {instructions && (
              <div>
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
                  Instructions
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
                  <pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap">
                    {instructions}
                  </pre>
                </div>
              </div>
            )}

            {/* Raw Gearfile */}
            <RawGearfile content={profile.gearfile_content} />
          </div>

          {/* Right Sidebar */}
          <div className="w-full md:w-52 shrink-0 space-y-7">
            {/* Total Installs */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                Total Installs
              </div>
              <div className="text-3xl font-bold font-mono text-neutral-100">
                {profile.downloads_count.toLocaleString()}
              </div>
            </div>

            {/* Compatibility */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                Compatibility
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.compatibility.map((p: string) => (
                  <CompatibilityBadge key={p} platform={p} />
                ))}
              </div>
            </div>

            {/* Security Audits */}
            <AuditBadges results={profile.audit_results} />

            {/* Visibility */}
            <VisibilityToggle
              profileId={profile.id}
              initialValue={profile.is_public}
              isOwner={isOwner}
            />

            {/* Version */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                Version
              </div>
              <div className="text-sm text-neutral-400 font-mono">{version}</div>
            </div>

            {/* Published */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                Published
              </div>
              <div className="text-sm text-neutral-400 font-mono">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Tags */}
            {profile.tags.length > 0 && (
              <div>
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Model */}
            {model && (
              <div>
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                  Model
                </div>
                <div className="text-sm text-neutral-400 font-mono">{model}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify the page compiles and loads**

```bash
pnpm --filter web exec tsc --noEmit
```

Then visit `http://localhost:3000/thomasindrias/power-setup` and verify the two-column layout renders.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(profiles\)/\[username\]/\[slug\]/page.tsx
git commit -m "feat(web): rewrite detail page with two-column layout, audits, and enriched plugin data"
```

---

### Task 9: Settings Page — My Gears Section

**Files:**
- Create: `apps/web/app/components/gear-list.tsx`
- Modify: `apps/web/app/settings/page.tsx`

- [ ] **Step 1: Create GearList component**

```typescript
// apps/web/app/components/gear-list.tsx
"use client";

import { useState, useEffect } from "react";
import { trpc } from "~/lib/trpc-client";

interface Gear {
  id: string;
  slug: string;
  name: string;
  is_public: boolean;
  downloads_count: number;
  users: { username: string };
}

export function GearList() {
  const [gears, setGears] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpc.profile.listOwn
      .query()
      .then((data) => setGears(data as Gear[]))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    const result = await trpc.profile.toggleVisibility.mutate({ id });
    setGears((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_public: result.is_public } : g)),
    );
  };

  if (loading) {
    return <p className="text-sm text-neutral-600 font-mono">Loading...</p>;
  }

  if (gears.length === 0) {
    return (
      <p className="text-sm text-neutral-600 font-mono">
        No gears published yet. Use <code className="text-neutral-400">gear push</code> to publish one.
      </p>
    );
  }

  return (
    <div className="divide-y divide-neutral-800/30">
      {gears.map((gear) => (
        <div key={gear.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href={`/${gear.users.username}/${gear.slug}`}
              className="text-sm font-mono text-neutral-200 hover:text-white transition"
            >
              {gear.name}
            </a>
            <span className="text-xs text-neutral-600 font-mono">
              @{gear.users.username}/{gear.slug}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-600 font-mono tabular-nums">
              {gear.downloads_count} installs
            </span>
            <button
              onClick={() => handleToggle(gear.id)}
              className="flex items-center gap-1.5 text-xs font-mono transition"
            >
              <span className={gear.is_public ? "text-green-400" : "text-amber-400"}>
                ●
              </span>
              <span className="text-neutral-500">
                {gear.is_public ? "Public" : "Private"}
              </span>
            </button>
            <a
              href={`/${gear.users.username}/${gear.slug}`}
              className="text-neutral-600 hover:text-neutral-300 transition"
            >
              →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update settings page to include My Gears section**

```typescript
// apps/web/app/settings/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseSSR } from "~/lib/supabase-ssr";
import { Nav } from "~/app/components/nav";
import { TokenManager } from "./token-manager";
import { GearList } from "~/app/components/gear-list";

export default async function SettingsPage() {
  const supabase = await createSupabaseSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-8">Settings</h1>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-4">
            My Gears
          </div>
          <GearList />
        </div>

        <div>
          <TokenManager />
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm --filter web exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/gear-list.tsx apps/web/app/settings/page.tsx
git commit -m "feat(web): add My Gears section to settings page with visibility toggles"
```

---

### Task 10: CLI --private Flag

**Files:**
- Modify: `packages/cli/src/commands/push.ts`

- [ ] **Step 1: Add --private flag to push command**

In `packages/cli/src/commands/push.ts`, add the option and pass it through:

After the existing `.option("-y, --yes", "Skip confirmation prompt")` line, add:

```typescript
  .option("--private", "Publish as private (only visible to you)")
```

Update the `opts` type to include `private?: boolean`.

In the `client.profile.publish.mutate()` call, add `is_public`:

```typescript
    const result = await client.profile.publish.mutate({
      slug,
      name,
      description,
      tags,
      compatibility: gearfile.compatibility,
      gearfile_content: content,
      is_public: !opts.private,
    });
```

- [ ] **Step 2: Update the CLI API types**

In `packages/cli/src/types/api.ts`, add `is_public` to the `PublishInput` type:

```typescript
export interface PublishInput {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
  gearfile_content: string;
  is_public?: boolean;
}
```

- [ ] **Step 3: Build and test**

```bash
pnpm --filter gear-cli build
gear push --help
```

Expected: `--private` flag appears in help output.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/push.ts packages/cli/src/types/api.ts
git commit -m "feat(cli): add --private flag to gear push"
```

---

### Task 11: Re-publish Existing Gear with Audits and Metadata

**Files:** None (manual test)

- [ ] **Step 1: Re-push the test gear to populate new columns**

```bash
pnpm --filter @gear/shared build && pnpm --filter gear-cli build
gear push --name "Thomas's Power Setup" --slug "power-setup" --description "Full-stack dev environment with superpowers, MCP servers, hooks, and 20+ plugins for Claude Code" --tags "claude-code,full-stack,superpowers,mcp" --yes
```

- [ ] **Step 2: Verify the detail page renders enriched data**

Visit `http://localhost:3000/thomasindrias/power-setup` and confirm:
- Two-column layout renders
- Plugins section shows list with marketplace names
- Skills section shows pill tags
- Security Audits section shows PASS/WARN badges
- Visibility toggle appears (since you're the owner)
- Raw Gearfile is collapsible

- [ ] **Step 3: Test visibility toggle**

Click the `[toggle]` button on the detail page. Verify it switches to "Private". Open an incognito window and visit the same URL — should show 404.

- [ ] **Step 4: Verify settings page**

Visit `http://localhost:3000/settings`. Confirm "My Gears" section appears with the gear listed and visibility toggle working.

---

### Task 12: Homepage Visibility Filtering

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Add is_public filter to homepage query**

In `apps/web/app/page.tsx`, add `.eq("is_public", true)` to the Supabase query:

```typescript
  let query = supabase
    .from("profiles")
    .select("*, users!inner(username, avatar_url)")
    .eq("is_public", true)
    .order("downloads_count", { ascending: false })
    .limit(50);
```

- [ ] **Step 2: Verify private gears don't appear on homepage**

If you toggled the test gear to private in Task 11, the homepage should show an empty leaderboard. Toggle it back to public and refresh — it should reappear.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(web): filter private gears from homepage"
```
