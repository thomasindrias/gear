import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readConfig, writeConfig, GEAR_DIR } from "./config.js";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../.test-gear");

describe("config", () => {
  beforeEach(() => {
    process.env.GEAR_HOME = TEST_DIR;
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    delete process.env.GEAR_HOME;
  });

  it("returns empty config when no file exists", () => {
    const config = readConfig();
    expect(config).toEqual({});
  });

  it("writes and reads config", () => {
    writeConfig({ token: "gear_pat_abc", platform: "claude-code" });
    const config = readConfig();
    expect(config.token).toBe("gear_pat_abc");
    expect(config.platform).toBe("claude-code");
  });
});
