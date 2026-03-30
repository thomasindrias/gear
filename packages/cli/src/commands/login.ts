import { Command } from "commander";
import { readConfig, writeConfig } from "../config.js";

export const loginCommand = new Command("login")
  .description("Authenticate with the Gear registry")
  .argument("<token>", "Personal Access Token from gear.sh/settings")
  .option("--platform <platform>", "Set default platform (claude-code or gemini-cli)")
  .option("--registry <url>", "Custom registry URL")
  .action((token: string, opts: { platform?: string; registry?: string }) => {
    if (!token.startsWith("gear_pat_")) {
      console.error("Error: Token must start with 'gear_pat_'. Get one at gear.sh/settings");
      process.exit(1);
    }

    const config = readConfig();
    config.token = token;

    if (opts.platform) {
      if (opts.platform !== "claude-code" && opts.platform !== "gemini-cli") {
        console.error("Error: Platform must be 'claude-code' or 'gemini-cli'");
        process.exit(1);
      }
      config.platform = opts.platform;
    }

    if (opts.registry) {
      config.registry_url = opts.registry;
    }

    writeConfig(config);
    console.log("Logged in successfully. Token stored in ~/.gear/config.json");
    if (config.platform) {
      console.log(`Default platform: ${config.platform}`);
    }
  });
