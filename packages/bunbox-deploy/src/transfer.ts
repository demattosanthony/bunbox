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
 * Transfer files to server using rsync
 */
export async function transferFiles(
  target: ResolvedTarget,
  releaseDir: string,
  verbose?: boolean
): Promise<void> {
  const sshPort = target.sshPort;
  const keyPath = target.privateKey;

  // Files/directories to transfer
  const includes = [
    "app/",
    "public/",
    ".bunbox/",
    "package.json",
    "bun.lock",
    "bunbox.config.ts",
    "bunbox.config.js",
  ];

  // Filter to only existing files
  const toTransfer = includes.filter((f) => {
    const path = f.endsWith("/") ? f.slice(0, -1) : f;
    return existsSync(path);
  });

  if (toTransfer.length === 0) {
    throw new Error("No files to transfer. Is this a Bunbox project?");
  }

  // Build rsync command
  const rsyncArgs = [
    "-avz", // archive, verbose, compress
    "--delete", // remove files not in source
    "-e",
    `ssh -i ${keyPath} -p ${sshPort} -o StrictHostKeyChecking=accept-new`,
    ...target.exclude.map((e) => `--exclude=${e}`),
    ...toTransfer,
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
