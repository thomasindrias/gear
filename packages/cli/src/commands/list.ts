import { Command } from "commander";
import { getGearDir } from "../config.js";
import { join } from "node:path";
import { readdirSync, readFileSync, existsSync } from "node:fs";

export const listCommand = new Command("list")
  .description("Show installed gear profiles")
  .action(() => {
    const profilesDir = join(getGearDir(), "profiles");
    const activeFile = join(getGearDir(), "active");

    if (!existsSync(profilesDir)) {
      console.log("No profiles installed. Run 'gear switch @user/slug' to install one.");
      return;
    }

    const active = existsSync(activeFile) ? readFileSync(activeFile, "utf-8").trim() : null;
    const entries = readdirSync(profilesDir);

    if (entries.length === 0) {
      console.log("No profiles installed.");
      return;
    }

    console.log("Installed profiles:\n");
    for (const entry of entries) {
      const marker = entry === active ? " *" : "";
      const displayName = entry.replace("--", "/");
      console.log(`  @${displayName}${marker}`);
    }

    if (active) {
      console.log(`\n  * = active`);
    }
  });
