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
