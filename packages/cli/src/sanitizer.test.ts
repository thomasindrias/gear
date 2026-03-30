import { describe, it, expect } from "vitest";
import { scrubPaths, detectSecrets } from "./sanitizer.js";

describe("scrubPaths", () => {
  it("replaces macOS home paths", () => {
    const input = '/Users/john/projects/foo';
    expect(scrubPaths(input)).toBe("<USER_HOME>/projects/foo");
  });

  it("replaces Linux home paths", () => {
    const input = '/home/john/.claude/settings.json';
    expect(scrubPaths(input)).toBe("<USER_HOME>/.claude/settings.json");
  });

  it("replaces Windows paths", () => {
    const input = 'C:\\Users\\john\\AppData\\config.json';
    expect(scrubPaths(input)).toBe("<USER_HOME>\\AppData\\config.json");
  });

  it("leaves non-home paths alone", () => {
    const input = "/usr/local/bin/node";
    expect(scrubPaths(input)).toBe("/usr/local/bin/node");
  });
});

describe("detectSecrets", () => {
  it("detects OpenAI/Anthropic API keys", () => {
    const secrets = detectSecrets('{ "key": "sk-abc123defghijklmnopqrstu" }');
    expect(secrets.length).toBeGreaterThan(0);
  });

  it("detects GitHub tokens", () => {
    const secrets = detectSecrets('{ "token": "ghp_abcdefghijklmnopqrstuv1234567890123456" }');
    expect(secrets.length).toBeGreaterThan(0);
  });

  it("detects Slack tokens", () => {
    const secrets = detectSecrets('{ "token": "xoxp-1234-5678-abcd-efgh" }');
    expect(secrets.length).toBeGreaterThan(0);
  });

  it("detects AWS access keys", () => {
    const secrets = detectSecrets('{ "key": "AKIAIOSFODNN7EXAMPLE" }');
    expect(secrets.length).toBeGreaterThan(0);
  });

  it("detects Supabase tokens", () => {
    const secrets = detectSecrets('{ "key": "sbp_abcdef12345678901234" }');
    expect(secrets.length).toBeGreaterThan(0);
  });

  it("returns empty for clean content", () => {
    const secrets = detectSecrets('{ "name": "Hello World" }');
    expect(secrets).toHaveLength(0);
  });
});
