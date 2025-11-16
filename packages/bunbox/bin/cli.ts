#!/usr/bin/env bun
/**
 * Bunbox CLI - Entry point for bunbox dev and bunbox start
 */

import { resolveConfig, type BunboxConfig } from "../src/core/config";
import { buildServerConfig } from "../src/core/server";

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || !["dev", "start", "build"].includes(command)) {
  console.error(`
Usage: bunbox <command> [options]

Commands:
  dev     Start development server with HMR
  start   Start production server
  build   Build production artifacts

Options:
  --port <number>       Server port (default: 3000)
  --hostname <string>   Server hostname (default: localhost)
  --app-dir <path>      Path to app directory (default: ./app)
  --ws-dir <path>       Path to WebSocket directory (default: ./app/ws)

Examples:
  bunbox dev
  bunbox start --port 8080
  bunbox build
  bunbox dev --app-dir ./src/app
`);
  process.exit(1);
}

// Parse CLI flags
const cliConfig: BunboxConfig = {};
for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === "--port" && next) {
    cliConfig.port = parseInt(next, 10);
    i++;
  } else if (arg === "--hostname" && next) {
    cliConfig.hostname = next;
    i++;
  } else if (arg === "--app-dir" && next) {
    cliConfig.appDir = next;
    i++;
  } else if (arg === "--ws-dir" && next) {
    cliConfig.wsDir = next;
    i++;
  }
}

// Handle build command separately
if (command === "build") {
  const { buildForProduction } = await import("../src/core/build");
  const config = await resolveConfig(cliConfig, false);
  await buildForProduction(config);
  process.exit(0);
}

// Resolve configuration
const development = command === "dev";
const config = await resolveConfig(cliConfig, development);

// Print header first
console.log("");
console.log("   📦 Bunbox");

// Build server config (this will initialize and determine worker-only mode)
const serverConfig = await buildServerConfig(config);

// Print mode-specific info
if (serverConfig.workerOnly) {
  console.log("   - Mode:    Worker");
} else {
  console.log(`   - Local:   http://${config.hostname}:${config.port}`);
}

console.log("");
console.log(" ○ Starting...");

// Print ready message after initialization
console.log(serverConfig.readyMessage);

// Start server or keep process alive for worker-only mode
if (serverConfig.workerOnly) {
  // Worker-only mode: don't start HTTP server
  // Keep process alive by preventing it from exiting
  // Workers should maintain their own resources (sockets, intervals, etc.)
  // which naturally keep the process alive
  process.stdin.resume();

  // Also set up signal handlers for graceful shutdown
  const shutdown = async () => {
    if (serverConfig.workerCleanup) {
      await serverConfig.workerCleanup();
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGQUIT", shutdown);
} else {
  // Normal mode: start HTTP server
  // This MUST be at top level for Bun's --hot to work properly
  const server = Bun.serve(serverConfig);

  // Start worker after server is listening (both dev and production)
  // Bun.serve() returns synchronously once the server is listening
  if (serverConfig.startWorkerAfterListen) {
    await serverConfig.startWorkerAfterListen();
  }
}
