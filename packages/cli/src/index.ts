#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";

const program = new Command()
  .name("gear")
  .description("Share, install, and switch AI agent configurations")
  .version("0.0.1");

program.addCommand(loginCommand);

program.parse();
