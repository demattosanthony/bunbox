#!/usr/bin/env bun
/**
 * bunbox-deploy CLI
 * Deploy Bunbox apps to VPS servers via SSH
 */

import { runCLI } from "../src/index";

const pkg = await import("../package.json");
const args = process.argv.slice(2);
const command = args[0];

const commands = [
  "init",
  "deploy",
  "status",
  "rollback",
  "setup",
  "setup-git",
  "logs",
  "ssh",
];

// Show help if no command or unknown command
if (args.includes("--help") || args.includes("-h") || !command) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(pkg.version);
  process.exit(0);
}

if (!commands.includes(command)) {
  console.error(`Unknown command: ${command}`);
  console.log(`Run 'bunbox-deploy --help' for usage.`);
  process.exit(1);
}

// Parse options
const options = parseOptions(args.slice(1));
await runCLI(command, options);

interface CLIOptions {
  positional: string[];
  config?: string;
  verbose?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  build?: boolean;
  install?: boolean;
  restart?: boolean;
  follow?: boolean;
}

function parseOptions(args: string[]): CLIOptions {
  const options: CLIOptions = { positional: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--verbose" || arg === "-V") {
      options.verbose = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if ((arg === "--config" || arg === "-c") && next) {
      options.config = next;
      i++;
    } else if (arg === "--no-build") {
      options.build = false;
    } else if (arg === "--no-install") {
      options.install = false;
    } else if (arg === "--no-restart") {
      options.restart = false;
    } else if (arg === "--follow" || arg === "-f") {
      options.follow = true;
    } else if (!arg.startsWith("-")) {
      (options.positional as string[]).push(arg);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
  bunbox-deploy v${pkg.version}

  Deploy Bunbox applications to VPS servers via SSH.

  Usage: bunbox-deploy <command> [target] [options]

  Commands:
    init                   Initialize deployment configuration
    deploy [target]        Deploy to target server
    status [target]        Show deployment status
    rollback [target]      Rollback to previous deployment
    setup [target]         Setup server (install Bun, PM2, Caddy)
    setup-git [target]     Test git repo access and setup deploy key
    logs [target]          View application logs
    ssh [target]           SSH into the server

  Options:
    -c, --config <path>    Config file (default: bunbox.deploy.ts)
    -V, --verbose          Verbose output
    --dry-run              Preview without executing
    -y, --yes              Skip confirmations

  Deploy Options:
    --no-build             Skip local build
    --no-install           Skip remote dependency install
    --no-restart           Skip PM2 restart

  Logs Options:
    -f, --follow           Follow log output (tail -f)

  Examples:
    bunbox-deploy init
    bunbox-deploy deploy production
    bunbox-deploy deploy staging --dry-run
    bunbox-deploy rollback production
    bunbox-deploy logs production --follow
    bunbox-deploy setup production
`);
}
