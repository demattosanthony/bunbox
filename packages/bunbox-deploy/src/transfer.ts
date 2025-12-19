/**
 * File transfer using rsync over SSH
 */

import { existsSync } from "fs";
import type { ResolvedTarget } from "./config";
import { detectWorkspace, type WorkspaceInfo } from "./workspace";

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

export interface TransferResult {
  /** Workspace info if deploying from a monorepo */
  workspace: WorkspaceInfo | null;
}

/**
 * Transfer files to server using rsync
 * Uses a blacklist approach - transfers everything except excluded patterns
 * Automatically detects and handles monorepo workspaces
 */
export async function transferFiles(
  target: ResolvedTarget,
  releaseDir: string,
  verbose?: boolean
): Promise<TransferResult> {
  const sshPort = target.sshPort;
  const keyPath = target.privateKey;

  // Verify we have something to transfer (at minimum, package.json should exist)
  if (!existsSync("package.json")) {
    throw new Error("No package.json found. Is this a Bunbox project?");
  }

  // Detect monorepo workspace (unless disabled)
  const workspace = target.monorepo?.disabled ? null : detectWorkspace();

  // Merge default excludes with user-provided excludes
  const allExcludes = [...new Set([...DEFAULT_EXCLUDES, ...target.exclude])];

  let rsyncArgs: string[];
  let cwd: string;

  if (workspace) {
    // Monorepo mode: transfer from root with selective includes
    cwd = workspace.root;

    // Build include list: root files + app + required packages
    const includes: string[] = [
      "package.json",
      "bun.lock",
      "bun.lockb",
      workspace.appPath,
      `${workspace.appPath}/**`,
    ];

    // Add required workspace packages
    for (const pkg of workspace.requiredPackages) {
      includes.push(pkg);
      includes.push(`${pkg}/**`);
    }

    // Add user-specified additional packages
    if (target.monorepo?.include) {
      for (const pkg of target.monorepo.include) {
        includes.push(pkg);
        includes.push(`${pkg}/**`);
      }
    }

    // Filter out excluded packages
    const excludedPkgs = target.monorepo?.exclude || [];

    rsyncArgs = [
      "-avz",
      "--delete",
      "-e",
      `ssh -i ${keyPath} -p ${sshPort} -o StrictHostKeyChecking=accept-new`,
      // Use include/exclude pattern for selective transfer
      "--include=*/", // Include all directories (needed for rsync to traverse)
      ...includes.map((i) => `--include=${i}`),
      ...excludedPkgs.map((e) => `--exclude=${e}`),
      ...excludedPkgs.map((e) => `--exclude=${e}/**`),
      ...allExcludes.map((e) => `--exclude=${e}`),
      "--exclude=*", // Exclude everything else at root
      "./",
      `${target.username}@${target.host}:${releaseDir}/`,
    ];

    if (verbose) {
      console.log(`  Monorepo detected: ${workspace.root}`);
      console.log(`  App path: ${workspace.appPath}`);
      console.log(`  Required packages: ${workspace.requiredPackages.join(", ") || "(none)"}`);
    }
  } else {
    // Standard mode: transfer current directory
    cwd = process.cwd();

    rsyncArgs = [
      "-avz",
      "--delete",
      "-e",
      `ssh -i ${keyPath} -p ${sshPort} -o StrictHostKeyChecking=accept-new`,
      ...allExcludes.map((e) => `--exclude=${e}`),
      "./",
      `${target.username}@${target.host}:${releaseDir}/`,
    ];
  }

  if (verbose) {
    console.log(`  rsync ${rsyncArgs.join(" ")}`);
  }

  const proc = Bun.spawn(["rsync", ...rsyncArgs], {
    cwd,
    stdout: verbose ? "inherit" : "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`File transfer failed: ${stderr}`);
  }

  return { workspace };
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
