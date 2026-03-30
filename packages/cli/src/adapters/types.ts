import type { Gearfile } from "gear-shared";

export interface ConfigPaths {
  settingsFile: string;
  instructionsFile: string;
  skillsDir: string;
  hooksDir: string;
  scriptsDir: string;
}

export interface PlatformAdapter {
  name: "claude-code" | "gemini-cli";
  detect(): boolean;
  getConfigPaths(): ConfigPaths;
  stash(stashDir: string): Promise<void>;
  restore(stashDir: string): Promise<void>;
  apply(gearfile: Gearfile, envVars: Record<string, string>): Promise<void>;
}
