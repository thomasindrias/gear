import { Command } from "commander";
import { readConfig, getGearDir } from "../config.js";
import { getAdapter } from "../adapters/index.js";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export const stashCommand = new Command("stash")
  .description("Snapshot current agent config before switching")
  .action(async () => {
    const config = readConfig();
    const adapter = getAdapter(config.platform);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const stashDir = join(getGearDir(), "stash", timestamp);
    mkdirSync(stashDir, { recursive: true });

    await adapter.stash(stashDir);
    console.log(`Stashed ${adapter.name} config to ${stashDir}`);
  });
