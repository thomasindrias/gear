import { Command } from "commander";
import { readConfig, getGearDir } from "../config.js";
import { getAdapter } from "../adapters/index.js";
import { join } from "node:path";
import { readdirSync, existsSync } from "node:fs";

export const restoreCommand = new Command("restore")
  .description("Restore the most recent stashed config")
  .action(async () => {
    const config = readConfig();
    const adapter = getAdapter(config.platform);
    const stashBaseDir = join(getGearDir(), "stash");

    if (!existsSync(stashBaseDir)) {
      console.error("No stashes found.");
      process.exit(1);
    }

    const entries = readdirSync(stashBaseDir).sort().reverse();
    if (entries.length === 0) {
      console.error("No stashes found.");
      process.exit(1);
    }

    const latestStash = join(stashBaseDir, entries[0]!);
    await adapter.restore(latestStash);
    console.log(`Restored ${adapter.name} config from ${latestStash}`);
  });
