import { describe, it, expect } from "vitest";
import {
  gearfileSchema,
  parseGearfile,
  serializeGearfile,
} from "./gearfile.js";

const VALID_GEARFILE = `---
name: "Test Gear"
slug: "test-gear"
description: "A test gear."
version: "1.0.0"
compatibility:
  - claude-code
  - gemini-cli
tags:
  - test
instructions: |
  You are a test assistant.
env_required:
  - API_KEY
mcp_servers:
  - name: "postgres"
    runtime: "node"
    package: "@modelcontextprotocol/server-postgres"
    args:
      - "<API_KEY>"
plugins:
  - name: "superpowers"
    marketplace: "claude-plugins-official"
skills:
  - name: "web-design"
    source: "marketplace"
custom_assets:
  - name: "my-hook"
    type: "hook"
    source: "https://gist.github.com/user/abc"
overrides:
  claude-code:
    model: "claude-sonnet-4-6"
---

## About

This is a test gear.
`;

describe("gearfileSchema", () => {
  it("validates a correct Gearfile frontmatter", () => {
    const parsed = parseGearfile(VALID_GEARFILE);
    expect(parsed.frontmatter.name).toBe("Test Gear");
    expect(parsed.frontmatter.slug).toBe("test-gear");
    expect(parsed.frontmatter.compatibility).toEqual([
      "claude-code",
      "gemini-cli",
    ]);
    expect(parsed.frontmatter.mcp_servers).toHaveLength(1);
    expect(parsed.frontmatter.mcp_servers![0].runtime).toBe("node");
    expect(parsed.frontmatter.plugins).toHaveLength(1);
    expect(parsed.frontmatter.skills).toHaveLength(1);
    expect(parsed.frontmatter.custom_assets).toHaveLength(1);
    expect(parsed.frontmatter.overrides).toEqual({
      "claude-code": { model: "claude-sonnet-4-6" },
    });
    expect(parsed.body).toContain("This is a test gear.");
  });

  it("rejects missing required fields", () => {
    const bad = `---
name: "No Slug"
---
body
`;
    expect(() => parseGearfile(bad)).toThrow();
  });

  it("rejects invalid compatibility values", () => {
    const bad = `---
name: "Bad"
slug: "bad"
description: "bad"
version: "1.0.0"
compatibility:
  - invalid-platform
tags: []
---
body
`;
    expect(() => parseGearfile(bad)).toThrow();
  });
});

describe("serializeGearfile", () => {
  it("roundtrips a Gearfile", () => {
    const parsed = parseGearfile(VALID_GEARFILE);
    const serialized = serializeGearfile(parsed.frontmatter, parsed.body);
    const reparsed = parseGearfile(serialized);
    expect(reparsed.frontmatter.name).toBe("Test Gear");
    expect(reparsed.body).toContain("This is a test gear.");
  });
});

describe("real-world gearfile", () => {
  const REAL_GEARFILE = `---
compatibility:
  - claude-code
tags:
  - test
mcp_servers: []
plugins:
  - name: superpowers
    marketplace: claude-plugins-official
  - name: context7
    marketplace: claude-plugins-official
  - name: figma
    marketplace: claude-plugins-official
  - name: atlassian
    marketplace: claude-plugins-official
skills:
  - name: chunking-strategy
    source: marketplace
  - name: web-design-guidelines
    source: marketplace
  - name: webapp-testing
    source: marketplace
env_required: []
overrides:
  claude-code:
    model: claude-sonnet-4-6
instructions: |
  @RTK.md
name: My Setup
slug: my-setup
description: A real gear setup
version: 1.0.0
---

## About This Gear

A real gear setup
`;

  it("parses a real gear push output", () => {
    const parsed = parseGearfile(REAL_GEARFILE);
    expect(parsed.frontmatter.plugins).toHaveLength(4);
    expect(parsed.frontmatter.skills).toHaveLength(3);
    expect(parsed.frontmatter.mcp_servers).toHaveLength(0);
    expect(parsed.frontmatter.env_required).toEqual([]);
    expect(parsed.frontmatter.overrides).toEqual({
      "claude-code": { model: "claude-sonnet-4-6" },
    });
    expect(parsed.frontmatter.instructions).toBe("@RTK.md\n");
  });

  it("roundtrips a real gearfile without data loss", () => {
    const parsed = parseGearfile(REAL_GEARFILE);
    const serialized = serializeGearfile(parsed.frontmatter, parsed.body);
    const reparsed = parseGearfile(serialized);

    expect(reparsed.frontmatter.name).toBe(parsed.frontmatter.name);
    expect(reparsed.frontmatter.slug).toBe(parsed.frontmatter.slug);
    expect(reparsed.frontmatter.plugins).toEqual(parsed.frontmatter.plugins);
    expect(reparsed.frontmatter.skills).toEqual(parsed.frontmatter.skills);
    expect(reparsed.frontmatter.mcp_servers).toEqual(parsed.frontmatter.mcp_servers);
    expect(reparsed.frontmatter.overrides).toEqual(parsed.frontmatter.overrides);
    expect(reparsed.frontmatter.instructions).toBe(parsed.frontmatter.instructions);
    expect(reparsed.frontmatter.env_required).toEqual(parsed.frontmatter.env_required);
  });

  it("parses gearfile with mcp servers and env placeholders", () => {
    const gearWithMcp = `---
name: MCP Gear
slug: mcp-gear
description: Has MCP servers
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
plugins: []
skills: []
---

body
`;
    const parsed = parseGearfile(gearWithMcp);
    expect(parsed.frontmatter.mcp_servers).toHaveLength(2);
    expect(parsed.frontmatter.mcp_servers![0].args).toEqual(["<DATABASE_URL>"]);
    expect(parsed.frontmatter.mcp_servers![1].env).toEqual({ GITHUB_TOKEN: "<GITHUB_TOKEN>" });
    expect(parsed.frontmatter.env_required).toEqual(["DATABASE_URL", "GITHUB_TOKEN"]);
  });
});
