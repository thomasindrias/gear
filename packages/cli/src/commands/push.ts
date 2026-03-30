import { Command } from "commander";
import prompts from "prompts";
import { readConfig } from "../config.js";
import { createGearClient } from "../trpc-client.js";
import { getAdapter } from "../adapters/index.js";
import { scanClaudeCode, scanGeminiCli } from "../scanner.js";
import { detectSecrets, scrubPaths } from "../sanitizer.js";
import { serializeGearfile, type Gearfile } from "@gear/shared";

export const pushCommand = new Command("push")
  .description("Scan, sanitize, and publish your current agent setup")
  .option("--dry-run", "Preview the generated Gearfile without uploading")
  .option("--platform <platform>", "Override platform detection")
  .action(async (opts: { dryRun?: boolean; platform?: string }) => {
    const config = readConfig();
    const adapter = getAdapter(opts.platform ?? config.platform);

    console.log(`Scanning ${adapter.name} setup...`);
    const scan = adapter.name === "claude-code" ? scanClaudeCode() : scanGeminiCli();

    for (const warning of scan.warnings) {
      console.warn(`  Warning: ${warning}`);
    }

    const { name } = await prompts({ type: "text", name: "name", message: "Gear name:" });
    const { slug } = await prompts({
      type: "text",
      name: "slug",
      message: "Slug (URL-safe, lowercase):",
      validate: (v) => /^[a-z0-9][a-z0-9-]*$/.test(v) || "Must be lowercase alphanumeric with hyphens",
    });
    const { description } = await prompts({ type: "text", name: "description", message: "Description:" });
    const { tagsStr } = await prompts({
      type: "text",
      name: "tagsStr",
      message: "Tags (comma-separated):",
    });
    const tags = tagsStr
      ? tagsStr.split(",").map((t: string) => t.trim().toLowerCase())
      : [];

    const gearfile: Gearfile = {
      name,
      slug,
      description,
      version: "1.0.0",
      compatibility: scan.gearfile.compatibility ?? [adapter.name],
      tags,
      ...scan.gearfile,
    } as Gearfile;

    const body = `## About This Gear\n\n${description}\n`;
    const content = serializeGearfile(gearfile, body);

    const secrets = detectSecrets(content);
    if (secrets.length > 0) {
      console.error("\nPotential secrets detected in generated Gearfile:");
      for (const s of secrets) {
        console.error(`  - ${s.pattern}: ${s.match.slice(0, 10)}...`);
      }
      console.error("\nAborting. Please remove sensitive data from your config and try again.");
      process.exit(1);
    }

    console.log("\n--- Generated Gearfile ---\n");
    console.log(content);
    console.log("--- End Gearfile ---\n");

    if (opts.dryRun) {
      console.log("Dry run complete. No data was uploaded.");
      return;
    }

    const { confirm } = await prompts({
      type: "confirm",
      name: "confirm",
      message: "Does this look safe to publish?",
      initial: true,
    });

    if (!confirm) {
      console.log("Aborted.");
      return;
    }

    if (!config.token) {
      console.error("Error: Not logged in. Run 'gear login <token>' first.");
      process.exit(1);
    }

    const client = createGearClient();
    const result = await client.profile.publish.mutate({
      slug,
      name,
      description,
      tags,
      compatibility: gearfile.compatibility,
      gearfile_content: content,
    });

    console.log(`\nPublished! View at: gear.sh/@${result.username}/${result.slug}`);
  });
