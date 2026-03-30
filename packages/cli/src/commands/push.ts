import { Command } from "commander";
import prompts from "prompts";
import { readConfig } from "../config.js";
import { createGearClient } from "../trpc-client.js";
import { getAdapter } from "../adapters/index.js";
import { scanClaudeCode, scanGeminiCli } from "../scanner.js";
import { detectSecrets, scrubPaths } from "../sanitizer.js";
import { serializeGearfile, type Gearfile } from "gear-shared";

export const pushCommand = new Command("push")
  .description("Scan, sanitize, and publish your current agent setup")
  .option("--dry-run", "Preview the generated Gearfile without uploading")
  .option("--platform <platform>", "Override platform detection")
  .option("--name <name>", "Gear name (skips prompt)")
  .option("--slug <slug>", "URL-safe slug (skips prompt)")
  .option("--description <desc>", "Description (skips prompt)")
  .option("--tags <tags>", "Comma-separated tags (skips prompt)")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--private", "Publish as private (only visible to you)")
  .action(async (opts: {
    dryRun?: boolean;
    platform?: string;
    name?: string;
    slug?: string;
    description?: string;
    tags?: string;
    yes?: boolean;
    private?: boolean;
  }) => {
    const config = readConfig();
    const adapter = getAdapter(opts.platform ?? config.platform);

    console.log(`Scanning ${adapter.name} setup...`);
    const scan = adapter.name === "claude-code" ? scanClaudeCode() : scanGeminiCli();

    for (const warning of scan.warnings) {
      console.warn(`  Warning: ${warning}`);
    }

    const name = opts.name ?? (await prompts({ type: "text", name: "name", message: "Gear name:" })).name;
    const slug = opts.slug ?? (await prompts({
      type: "text",
      name: "slug",
      message: "Slug (URL-safe, lowercase):",
      validate: (v) => /^[a-z0-9][a-z0-9-]*$/.test(v) || "Must be lowercase alphanumeric with hyphens",
    })).slug;
    const description = opts.description ?? (await prompts({ type: "text", name: "description", message: "Description:" })).description;

    let tags: string[];
    if (opts.tags !== undefined) {
      tags = opts.tags ? opts.tags.split(",").map((t) => t.trim().toLowerCase()) : [];
    } else {
      const { tagsStr } = await prompts({ type: "text", name: "tagsStr", message: "Tags (comma-separated):" });
      tags = tagsStr ? tagsStr.split(",").map((t: string) => t.trim().toLowerCase()) : [];
    }

    if (!name || !slug || !description) {
      console.error("Error: name, slug, and description are required.");
      process.exit(1);
    }

    const gearfile: Gearfile = {
      ...scan.gearfile,
      name,
      slug,
      description,
      version: "1.0.0",
      compatibility: scan.gearfile.compatibility ?? [adapter.name],
      tags,
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

    if (!opts.yes) {
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
    }

    if (!config.token) {
      console.error("Error: Not logged in. Run 'gear login <token>' first.");
      process.exit(1);
    }

    const client = createGearClient();
    let result;
    try {
      result = await client.profile.publish.mutate({
        slug,
        name,
        description,
        tags,
        compatibility: gearfile.compatibility,
        gearfile_content: content,
        is_public: !opts.private,
      });
    } catch (err: any) {
      const message = err?.message ?? "Unknown error";
      if (message.includes("UNAUTHORIZED") || message.includes("Not authenticated")) {
        console.error("Error: Not authenticated. Run 'gear login <token>' first.");
      } else if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
        console.error("Error: Could not connect to the Gear registry. Check your internet connection.");
      } else {
        console.error(`Error: ${message}`);
      }
      process.exit(1);
    }

    console.log(`\nPublished! View at: gear-beige.vercel.app/@${result.username}/${result.slug}`);
  });
