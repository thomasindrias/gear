import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface GearConfig {
  token?: string;
  platform?: "claude-code" | "gemini-cli";
  registry_url?: string;
}

export function getGearDir(): string {
  return process.env.GEAR_HOME ?? join(homedir(), ".gear");
}

export const GEAR_DIR = getGearDir();

function configPath(): string {
  return join(getGearDir(), "config.json");
}

export function readConfig(): GearConfig {
  const path = configPath();
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function writeConfig(config: GearConfig): void {
  const dir = getGearDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = configPath();
  writeFileSync(path, JSON.stringify(config, null, 2));
  chmodSync(path, 0o600);
}
