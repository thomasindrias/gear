import { ClaudeCodeAdapter } from "./claude-code.js";
import { GeminiCliAdapter } from "./gemini-cli.js";
import type { PlatformAdapter } from "./types.js";

export type { PlatformAdapter, ConfigPaths } from "./types.js";

const adapters: PlatformAdapter[] = [
  new ClaudeCodeAdapter(),
  new GeminiCliAdapter(),
];

export function getAdapter(platform?: string): PlatformAdapter {
  if (platform) {
    const adapter = adapters.find((a) => a.name === platform);
    if (!adapter) {
      throw new Error(`Unknown platform: ${platform}. Supported: claude-code, gemini-cli`);
    }
    return adapter;
  }

  // Auto-detect
  for (const adapter of adapters) {
    if (adapter.detect()) {
      return adapter;
    }
  }

  throw new Error(
    "Could not detect any supported platform. Use --platform to specify one.",
  );
}
