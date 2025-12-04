/**
 * Main deployment workflow
 */

import type { ResolvedTarget } from "./config";
import { SSHClient } from "./ssh";
import { buildLocally, transferFiles, checkRsync } from "./transfer";
import { setupPM2, startOrReload, isPM2Installed, installPM2 } from "./pm2";
import {
  configureCaddy,
  isCaddyInstalled,
  printDNSInstructions,
  isDomainConfigured,
} from "./caddy";
import { Spinner, log, printHeader, formatKV, generateReleaseId } from "./utils";
import pc from "picocolors";

export interface DeployOptions {
  build?: boolean;
  install?: boolean;
  restart?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

/**
 * Main deployment workflow
 */
export async function deploy(
  target: ResolvedTarget,
  targetName: string,
  options: DeployOptions = {}
): Promise<void> {
  const {
    build = true,
    install = true,
    restart = true,
    verbose = false,
    dryRun = false,
  } = options;

  const releaseId = generateReleaseId();
  const releaseDir = `${target.deployPath}/releases/${releaseId}`;
  const currentLink = `${target.deployPath}/current`;

  const spinner = new Spinner();

  printHeader(`Deploying to ${targetName}`);
  console.log(formatKV("Server", `${target.username}@${target.host}`));
  console.log(formatKV("Path", target.deployPath));
  console.log(formatKV("Release", releaseId));
  if (target.domain) {
    console.log(formatKV("Domain", target.domain));
  }
  console.log();

  if (dryRun) {
    log.warn("Dry run mode - no changes will be made");
    console.log();
  }

  // Check rsync is available
  if (!(await checkRsync())) {
    throw new Error("rsync is not installed. Please install rsync to continue.");
  }

  let ssh: SSHClient | null = null;

  try {
    // 1. Connect to server
    spinner.start("Connecting to server...");
    if (!dryRun) {
      ssh = new SSHClient(target);
      await ssh.connect();
    }
    spinner.succeed(`Connected to ${target.host}`);

    // 2. Pre-flight checks
    spinner.start("Running pre-flight checks...");
    if (ssh) {
      await preflightChecks(ssh, target, spinner);
    }
    spinner.succeed("Pre-flight checks passed");

    // 3. Build locally
    if (build) {
      spinner.start("Building application...");
      if (!dryRun) {
        await buildLocally(verbose);
      }
      spinner.succeed("Build complete");
    }

    // 4. Prepare release directory
    spinner.start("Preparing release directory...");
    if (ssh) {
      await ssh.exec(`mkdir -p ${releaseDir}`);
      await ssh.exec(`mkdir -p ${target.deployPath}/shared`);
      await ssh.exec(`mkdir -p ${target.deployPath}/logs`);
    }
    spinner.succeed("Release directory ready");

    // 5. Transfer files
    spinner.start("Transferring files...");
    if (!dryRun) {
      await transferFiles(target, releaseDir, verbose);
    }
    spinner.succeed("Files transferred");

    // 6. Install dependencies on server
    if (install && ssh) {
      spinner.start("Installing dependencies...");
      if (!dryRun) {
        const result = await ssh.exec(
          `cd ${releaseDir} && bun install --frozen-lockfile --production`
        );
        if (result.code !== 0) {
          throw new Error(`Failed to install dependencies: ${result.stderr}`);
        }
      }
      spinner.succeed("Dependencies installed");
    }

    // 7. Link shared files (e.g., .env)
    spinner.start("Linking shared files...");
    if (ssh) {
      const sharedEnv = `${target.deployPath}/shared/.env`;
      const hasSharedEnv = await ssh.pathExists(sharedEnv);
      if (hasSharedEnv) {
        await ssh.exec(`ln -sf ${sharedEnv} ${releaseDir}/.env`);
      }
    }
    spinner.succeed("Shared files linked");

    // 8. Activate release (update symlink)
    spinner.start("Activating release...");
    if (ssh && !dryRun) {
      await ssh.exec(`ln -sfn ${releaseDir} ${currentLink}`);
    }
    spinner.succeed("Release activated");

    // 9. Setup and restart PM2
    if (restart && ssh) {
      spinner.start("Configuring PM2...");
      if (!dryRun) {
        await setupPM2(ssh, target);
      }
      spinner.succeed("PM2 configured");

      spinner.start("Restarting application...");
      if (!dryRun) {
        await startOrReload(ssh, target);
      }
      spinner.succeed("Application restarted");
    }

    // 10. Health check
    spinner.start("Running health check...");
    if (ssh && !dryRun) {
      await new Promise((r) => setTimeout(r, 2000)); // Wait for startup
      const healthy = await healthCheck(ssh, target);
      if (!healthy) {
        spinner.warn("Health check failed - app may still be starting");
      } else {
        spinner.succeed("Health check passed");
      }
    } else {
      spinner.succeed("Health check skipped (dry run)");
    }

    // 11. Configure Caddy if domain is set
    if (target.domain && ssh) {
      const alreadyConfigured = await isDomainConfigured(ssh, target.domain);

      if (!alreadyConfigured) {
        spinner.start("Configuring Caddy...");
        if (!dryRun) {
          await configureCaddy(ssh, target);
        }
        spinner.succeed("Caddy configured");

        // Get server IP and print DNS instructions
        const serverIP = await ssh.getPublicIP();
        printDNSInstructions(target.domain, serverIP);
      }
    }

    // 12. Cleanup old releases
    spinner.start("Cleaning up old releases...");
    if (ssh && !dryRun) {
      await cleanupReleases(ssh, target.deployPath, target.keepReleases);
    }
    spinner.succeed("Cleanup complete");

    // Success!
    printDeploySummary(target, releaseId);
  } finally {
    ssh?.disconnect();
  }
}

/**
 * Run pre-flight checks on the server
 */
async function preflightChecks(
  ssh: SSHClient,
  target: ResolvedTarget,
  spinner: Spinner
): Promise<void> {
  // Check Bun is installed
  const hasBun = await ssh.commandExists("bun");
  if (!hasBun) {
    throw new Error(
      "Bun is not installed on the server. Run 'bunbox-deploy setup' first."
    );
  }

  // Check PM2 is installed
  const hasPM2 = await isPM2Installed(ssh);
  if (!hasPM2) {
    throw new Error(
      "PM2 is not installed on the server. Run 'bunbox-deploy setup' first."
    );
  }

  // Check Caddy if domain is configured
  if (target.domain) {
    const hasCaddy = await isCaddyInstalled(ssh);
    if (!hasCaddy) {
      spinner.warn("Caddy not installed - skipping HTTPS setup");
    }
  }
}

/**
 * Check if the application is healthy
 */
async function healthCheck(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<boolean> {
  try {
    const result = await ssh.exec(
      `curl -sf http://localhost:${target.port}/api/health || curl -sf http://localhost:${target.port}/`
    );
    return result.code === 0;
  } catch {
    return false;
  }
}

/**
 * Remove old releases, keeping the most recent N
 */
async function cleanupReleases(
  ssh: SSHClient,
  deployPath: string,
  keep: number
): Promise<void> {
  const releasesDir = `${deployPath}/releases`;

  // Get sorted list of releases (oldest first)
  const result = await ssh.exec(`ls -1t ${releasesDir}`);
  if (result.code !== 0) return;

  const releases = result.stdout.split("\n").filter(Boolean);

  // Remove oldest releases beyond the keep limit
  if (releases.length > keep) {
    const toRemove = releases.slice(keep);
    for (const release of toRemove) {
      await ssh.exec(`rm -rf ${releasesDir}/${release}`);
    }
  }
}

/**
 * Print deployment summary
 */
function printDeploySummary(target: ResolvedTarget, releaseId: string): void {
  console.log();
  console.log(pc.green(pc.bold("  Deployment successful!")));
  console.log();

  const url = target.domain
    ? `https://${target.domain}`
    : `http://${target.host}:${target.port}`;

  console.log(formatKV("Release", releaseId));
  console.log(formatKV("URL", pc.cyan(url)));
  console.log();
  console.log(pc.dim("  Helpful commands:"));
  console.log(pc.dim(`    bunbox-deploy logs     - View application logs`));
  console.log(pc.dim(`    bunbox-deploy status   - Check deployment status`));
  console.log(pc.dim(`    bunbox-deploy rollback - Rollback to previous release`));
  console.log();
}

/**
 * Rollback to a previous release
 */
export async function rollback(
  target: ResolvedTarget,
  targetName: string,
  steps: number = 1
): Promise<void> {
  const spinner = new Spinner();
  const releasesDir = `${target.deployPath}/releases`;
  const currentLink = `${target.deployPath}/current`;

  printHeader(`Rolling back ${targetName}`);

  const ssh = new SSHClient(target);

  try {
    spinner.start("Connecting to server...");
    await ssh.connect();
    spinner.succeed(`Connected to ${target.host}`);

    // Get list of releases
    spinner.start("Finding releases...");
    const result = await ssh.exec(`ls -1t ${releasesDir}`);
    if (result.code !== 0) {
      throw new Error("Failed to list releases");
    }

    const releases = result.stdout.split("\n").filter(Boolean);
    if (releases.length <= steps) {
      throw new Error(
        `Cannot rollback ${steps} version(s). Only ${releases.length} release(s) available.`
      );
    }

    // Get current release
    const currentResult = await ssh.exec(`readlink ${currentLink}`);
    const currentRelease = currentResult.stdout.trim().split("/").pop();
    const currentIndex = releases.indexOf(currentRelease || "");

    if (currentIndex === -1) {
      throw new Error("Could not determine current release");
    }

    const targetIndex = currentIndex + steps;
    if (targetIndex >= releases.length) {
      throw new Error(
        `Cannot rollback ${steps} version(s). Only ${releases.length - currentIndex - 1} older release(s) available.`
      );
    }

    const targetRelease = releases[targetIndex];
    spinner.succeed(`Found release: ${targetRelease}`);

    // Update symlink
    spinner.start("Rolling back...");
    await ssh.exec(`ln -sfn ${releasesDir}/${targetRelease} ${currentLink}`);
    spinner.succeed("Symlink updated");

    // Restart PM2
    spinner.start("Restarting application...");
    await startOrReload(ssh, target);
    spinner.succeed("Application restarted");

    console.log();
    log.success(`Rolled back to release: ${pc.bold(targetRelease)}`);
    console.log();
  } finally {
    ssh.disconnect();
  }
}

/**
 * Get deployment status
 */
export async function status(
  target: ResolvedTarget,
  targetName: string
): Promise<void> {
  const spinner = new Spinner();
  const currentLink = `${target.deployPath}/current`;

  printHeader(`Status: ${targetName}`);
  console.log(formatKV("Server", `${target.username}@${target.host}`));
  console.log(formatKV("Path", target.deployPath));
  console.log();

  const ssh = new SSHClient(target);

  try {
    spinner.start("Connecting...");
    await ssh.connect();
    spinner.succeed("Connected");

    // Get current release
    const releaseResult = await ssh.exec(`readlink ${currentLink}`);
    const currentRelease = releaseResult.stdout.trim().split("/").pop() || "unknown";
    console.log(formatKV("Release", currentRelease));

    // Get PM2 status
    const { getAppStatus } = await import("./pm2");
    const appStatus = await getAppStatus(ssh, target.name);

    if (appStatus) {
      console.log(formatKV("Status", pc.green(appStatus.status)));
      console.log(formatKV("Uptime", appStatus.uptime));
      console.log(formatKV("Memory", appStatus.memory));
      console.log(formatKV("CPU", appStatus.cpu));
    } else {
      console.log(formatKV("Status", pc.yellow("not running")));
    }

    // List available releases
    const releasesResult = await ssh.exec(
      `ls -1t ${target.deployPath}/releases | head -5`
    );
    const releases = releasesResult.stdout.split("\n").filter(Boolean);

    if (releases.length > 0) {
      console.log();
      console.log(pc.dim("  Recent releases:"));
      for (const release of releases) {
        const isCurrent = release === currentRelease;
        const prefix = isCurrent ? pc.green("→") : " ";
        console.log(`    ${prefix} ${release}${isCurrent ? pc.dim(" (current)") : ""}`);
      }
    }

    console.log();
  } finally {
    ssh.disconnect();
  }
}
