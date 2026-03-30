import { Command } from "commander";
import prompts from "prompts";
import { readConfig, getGearDir } from "../config.js";
import { createGearClient } from "../trpc-client.js";
import { getAdapter } from "../adapters/index.js";
import { parseGearfile } from "@gear/shared";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

export const switchCommand = new Command("switch")
  .description("Install and activate a gear profile")
  .argument("<profile>", "Profile to switch to (@username/slug)")
  .option("--platform <platform>", "Override platform (claude-code or gemini-cli)")
  .action(async (profile: string, opts: { platform?: string }) => {
    const match = profile.match(/^@?([^/]+)\/(.+)$/);
    if (!match) {
      console.error("Error: Profile must be in format @username/slug");
      process.exit(1);
    }
    const [, username, slug] = match;

    const config = readConfig();
    const adapter = getAdapter(opts.platform ?? config.platform);
    const client = createGearClient();

    console.log(`Downloading @${username}/${slug}...`);
    const { gearfile_content } = await client.profile.download.query({
      username: username!,
      slug: slug!,
    });

    const { frontmatter: gearfile } = parseGearfile(gearfile_content);

    if (!gearfile.compatibility.includes(adapter.name)) {
      console.warn(
        `Warning: This gear is not tagged as compatible with ${adapter.name}.`,
      );
      const { proceed } = await prompts({
        type: "confirm",
        name: "proceed",
        message: "Continue anyway?",
        initial: false,
      });
      if (!proceed) process.exit(0);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const stashDir = join(getGearDir(), "stash", timestamp);
    await adapter.stash(stashDir);
    console.log(`Stashed current ${adapter.name} config.`);

    const envVars: Record<string, string> = {};
    if (gearfile.env_required?.length) {
      console.log("\nThis gear requires the following environment variables:");
      for (const varName of gearfile.env_required) {
        const existing = process.env[varName];
        if (existing) {
          envVars[varName] = existing;
          console.log(`  ${varName}: using existing env value`);
        } else {
          const { value } = await prompts({
            type: "text",
            name: "value",
            message: `Enter value for ${varName}:`,
          });
          if (!value) {
            console.warn(`Warning: ${varName} was left empty.`);
          }
          envVars[varName] = value ?? "";
        }
      }
    }

    console.log(`\nApplying gear to ${adapter.name}...`);
    await adapter.apply(gearfile, envVars);

    const profileKey = `${username}--${slug}`;
    const profileDir = join(getGearDir(), "profiles", profileKey);
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(join(profileDir, "Gearfile.md"), gearfile_content);

    writeFileSync(join(getGearDir(), "active"), profileKey);

    console.log(`\nSwitched to @${username}/${slug}`);
    console.log("Restart your agent to pick up the changes.");
  });
