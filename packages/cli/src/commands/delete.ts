import { Command } from "commander";
import prompts from "prompts";
import { readConfig } from "../config.js";
import { createGearClient } from "../trpc-client.js";

export const deleteCommand = new Command("delete")
  .description("Delete a gear profile from the registry")
  .argument("<slug>", "Slug of the gear to delete")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (slug: string, opts: { yes?: boolean }) => {
    const config = readConfig();

    if (!config.token) {
      console.error("Error: Not logged in. Run 'gear login <token>' first.");
      process.exit(1);
    }

    if (!opts.yes) {
      const { confirm } = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Are you sure you want to delete "${slug}"? This cannot be undone.`,
        initial: false,
      });

      if (!confirm) {
        console.log("Aborted.");
        return;
      }
    }

    const client = createGearClient();
    try {
      await client.profile.delete.mutate({ slug });
      console.log(`Deleted "${slug}" from the registry.`);
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
  });
