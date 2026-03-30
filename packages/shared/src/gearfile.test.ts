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
