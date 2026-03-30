#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { stashCommand } from "./commands/stash.js";
import { restoreCommand } from "./commands/restore.js";
import { listCommand } from "./commands/list.js";

const program = new Command()
  .name("gear")
  .description("Share, install, and switch AI agent configurations")
  .version("0.0.1");

program.addCommand(loginCommand);
program.addCommand(stashCommand);
program.addCommand(restoreCommand);
program.addCommand(listCommand);

program.parse();
