import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { parseGearfile } from "@gear/shared";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("ClaudeCodeAdapter.apply", () => {
  let adapter: ClaudeCodeAdapter;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `gear-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    // Override the base dir for testing
    adapter = new ClaudeCodeAdapter();
    (adapter as any).baseDir = testDir;
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("writes instructions to CLAUDE.md", async () => {
    const gearfile = parseGearfile(`---
name: Test
slug: test
description: test
version: 1.0.0
compatibility:
  - claude-code
tags: []
instructions: |
  You are a helpful assistant.
  Always use TypeScript.
---
body
`);

    await adapter.apply(gearfile.frontmatter, {});

    const paths = adapter.getConfigPaths();
    const content = readFileSync(paths.instructionsFile, "utf-8");
    expect(content).toBe("You are a helpful assistant.\nAlways use TypeScript.\n");
  });

  it("enables plugins in settings.json", async () => {
    const gearfile = parseGearfile(`---
name: Test
slug: test
description: test
version: 1.0.0
compatibility:
  - claude-code
tags: []
plugins:
  - name: superpowers
    marketplace: claude-plugins-official
  - name: context7
    marketplace: claude-plugins-official
---
body
`);

    await adapter.apply(gearfile.frontmatter, {});

    const paths = adapter.getConfigPaths();
    const settings = JSON.parse(readFileSync(paths.settingsFile, "utf-8"));
    expect(settings.enabledPlugins["superpowers@claude-plugins-official"]).toBe(true);
    expect(settings.enabledPlugins["context7@claude-plugins-official"]).toBe(true);
  });

  it("configures MCP servers with env var substitution", async () => {
    const gearfile = parseGearfile(`---
name: Test
slug: test
description: test
version: 1.0.0
compatibility:
  - claude-code
tags: []
mcp_servers:
  - name: postgres
    runtime: node
    package: "@modelcontextprotocol/server-postgres"
    args:
      - "<DATABASE_URL>"
  - name: github
    runtime: node
    package: "@modelcontextprotocol/server-github"
    env:
      GITHUB_TOKEN: "<GITHUB_TOKEN>"
env_required:
  - DATABASE_URL
  - GITHUB_TOKEN
---
body
`);

    await adapter.apply(gearfile.frontmatter, {
      DATABASE_URL: "postgres://localhost:5432/mydb",
      GITHUB_TOKEN: "ghp_test123",
    });

    const paths = adapter.getConfigPaths();
    const settings = JSON.parse(readFileSync(paths.settingsFile, "utf-8"));

    expect(settings.mcpServers.postgres.command).toBe("npx");
    expect(settings.mcpServers.postgres.args).toEqual([
      "-y",
      "@modelcontextprotocol/server-postgres",
      "postgres://localhost:5432/mydb",
    ]);
    expect(settings.mcpServers.github.env.GITHUB_TOKEN).toBe("ghp_test123");
  });

  it("applies model override from overrides field", async () => {
    const gearfile = parseGearfile(`---
name: Test
slug: test
description: test
version: 1.0.0
compatibility:
  - claude-code
tags: []
overrides:
  claude-code:
    model: claude-sonnet-4-6
---
body
`);

    await adapter.apply(gearfile.frontmatter, {});

    const paths = adapter.getConfigPaths();
    const settings = JSON.parse(readFileSync(paths.settingsFile, "utf-8"));
    expect(settings.model).toBe("claude-sonnet-4-6");
  });

  it("merges with existing settings without clobbering", async () => {
    const paths = adapter.getConfigPaths();
    writeFileSync(
      paths.settingsFile,
      JSON.stringify({
        existingKey: "keep-me",
        mcpServers: { existing: { command: "npx", args: ["-y", "existing-pkg"] } },
      }),
    );

    const gearfile = parseGearfile(`---
name: Test
slug: test
description: test
version: 1.0.0
compatibility:
  - claude-code
tags: []
mcp_servers:
  - name: new-server
    runtime: node
    package: new-pkg
plugins:
  - name: superpowers
    marketplace: claude-plugins-official
---
body
`);

    await adapter.apply(gearfile.frontmatter, {});

    const settings = JSON.parse(readFileSync(paths.settingsFile, "utf-8"));
    expect(settings.existingKey).toBe("keep-me");
    expect(settings.mcpServers.existing).toBeDefined();
    expect(settings.mcpServers["new-server"]).toBeDefined();
  });

  it("full round-trip: push-format gearfile applies correctly", async () => {
    // This is the exact format gear push generates
    const pushOutput = `---
compatibility:
  - claude-code
tags:
  - fullstack
  - nextjs
mcp_servers: []
plugins:
  - name: superpowers
    marketplace: claude-plugins-official
  - name: context7
    marketplace: claude-plugins-official
  - name: figma
    marketplace: claude-plugins-official
skills:
  - name: chunking-strategy
    source: marketplace
  - name: web-design-guidelines
    source: marketplace
env_required: []
overrides:
  claude-code:
    model: claude-sonnet-4-6
instructions: |
  @RTK.md
name: My Setup
slug: my-setup
description: My fullstack dev setup
version: 1.0.0
---

## About This Gear

My fullstack dev setup
`;

    const { frontmatter } = parseGearfile(pushOutput);
    await adapter.apply(frontmatter, {});

    const paths = adapter.getConfigPaths();

    // Check instructions written
    const instructions = readFileSync(paths.instructionsFile, "utf-8");
    expect(instructions).toBe("@RTK.md\n");

    // Check settings
    const settings = JSON.parse(readFileSync(paths.settingsFile, "utf-8"));
    expect(settings.enabledPlugins["superpowers@claude-plugins-official"]).toBe(true);
    expect(settings.enabledPlugins["context7@claude-plugins-official"]).toBe(true);
    expect(settings.enabledPlugins["figma@claude-plugins-official"]).toBe(true);
    expect(settings.model).toBe("claude-sonnet-4-6");
    // Empty mcp_servers should not create entries
    expect(settings.mcpServers).toBeUndefined();
  });
});
