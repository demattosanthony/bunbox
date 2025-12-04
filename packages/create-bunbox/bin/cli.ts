#!/usr/bin/env bun
/**
 * create-bunbox CLI
 * Usage: bunx create-bunbox [project-name] [options]
 */

import { runCLI } from "../src/index";

const pkg = await import("../package.json");

// Parse CLI arguments
const args = process.argv.slice(2);

// Extract options and project name
const options: {
  projectName?: string;
  template?: string;
  skipGit?: boolean;
  skipInstall?: boolean;
} = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (arg === "--version" || arg === "-v") {
    console.log(pkg.version);
    process.exit(0);
  } else if ((arg === "--template" || arg === "-t") && next) {
    options.template = next;
    i++;
  } else if (arg === "--skip-git") {
    options.skipGit = true;
  } else if (arg === "--skip-install") {
    options.skipInstall = true;
  } else if (arg && !arg.startsWith("-")) {
    options.projectName = arg;
  }
}

await runCLI(options);

function printHelp() {
  console.log(`
  create-bunbox v${pkg.version}

  Create a new Bunbox project with a single command.

  Usage: create-bunbox [project-name] [options]

  Options:
    -t, --template <name>  Template to use (basic, tailwind, full)
    --skip-git             Skip git initialization
    --skip-install         Skip dependency installation
    -h, --help             Show this help message
    -v, --version          Show version number

  Examples:
    bunx create-bunbox my-app
    bunx create-bunbox my-app --template tailwind
    bunx create-bunbox my-app -t full --skip-install
`);
}
