import { Command } from "commander";
import prompts from "prompts";
import { readConfig, writeConfig } from "../config.js";

export const loginCommand = new Command("login")
  .description("Authenticate with the Gear registry")
  .argument("[token]", "Personal Access Token (omit to enter interactively)")
  .option("--platform <platform>", "Set default platform (claude-code or gemini-cli)")
  .option("--registry <url>", "Custom registry URL")
  .action(async (tokenArg: string | undefined, opts: { platform?: string; registry?: string }) => {
    let token = tokenArg;

    if (!token) {
      const { value } = await prompts({
        type: "password",
        name: "value",
        message: "Paste your Personal Access Token (from gear-beige.vercel.app/settings):",
      });
      token = value;
    }

    if (!token) {
      console.error("Error: Token is required.");
      process.exit(1);
    }

    if (!token.startsWith("gear_pat_")) {
      console.error("Error: Token must start with 'gear_pat_'. Get one at gear-beige.vercel.app/settings");
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
