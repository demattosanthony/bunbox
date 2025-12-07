/**
 * File transfer using rsync over SSH
 */

import { existsSync } from "fs";
import type { ResolvedTarget } from "./config";

/**
 * Build the application locally
 */
export async function buildLocally(verbose?: boolean): Promise<void> {
  // Check if bunbox build is available
  const proc = Bun.spawn(["bunbox", "build"], {
    cwd: process.cwd(),
    stdout: verbose ? "inherit" : "pipe",
    stderr: verbose ? "inherit" : "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    if (!verbose) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Build failed: ${stderr}`);
    }
    throw new Error("Build failed");
  }

  // Verify build output exists
  if (!existsSync(".bunbox")) {
    throw new Error("Build output not found. Expected .bunbox/ directory.");
  }
}

/**
 * Default patterns to exclude from transfer
 * These are always excluded unless explicitly overridden
 */
const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  ".env",
  ".env.*",
  ".DS_Store",
  "*.log",
  ".turbo",
  ".cache",
  "coverage",
  ".nyc_output",
  ".vscode",
  ".idea",
  "*.local",
];

/**
 * Transfer files to server using rsync
 * Uses a blacklist approach - transfers everything except excluded patterns
 */
export async function transferFiles(
  target: ResolvedTarget,
  releaseDir: string,
  verbose?: boolean
): Promise<void> {
  const sshPort = target.sshPort;
  const keyPath = target.privateKey;

  // Verify we have something to transfer (at minimum, package.json should exist)
  if (!existsSync("package.json")) {
    throw new Error("No package.json found. Is this a Bunbox project?");
  }

  // Merge default excludes with user-provided excludes
  const allExcludes = [...new Set([...DEFAULT_EXCLUDES, ...target.exclude])];

  // Build rsync command - transfer entire directory with excludes
  const rsyncArgs = [
    "-avz", // archive, verbose, compress
    "--delete", // remove files not in source
    "-e",
    `ssh -i ${keyPath} -p ${sshPort} -o StrictHostKeyChecking=accept-new`,
    ...allExcludes.map((e) => `--exclude=${e}`),
    "./", // Transfer entire current directory
    `${target.username}@${target.host}:${releaseDir}/`,
  ];

  if (verbose) {
    console.log(`  rsync ${rsyncArgs.join(" ")}`);
  }

  const proc = Bun.spawn(["rsync", ...rsyncArgs], {
    cwd: process.cwd(),
    stdout: verbose ? "inherit" : "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`File transfer failed: ${stderr}`);
  }
}

/**
 * Check if rsync is available locally
 */
export async function checkRsync(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", "rsync"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
