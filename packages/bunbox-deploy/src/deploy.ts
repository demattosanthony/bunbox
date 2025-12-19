/**
 * Main deployment workflow
 */

import type { ResolvedTarget } from "./config";
import { SSHClient } from "./ssh";
import { transferFiles, checkRsync, type TransferResult } from "./transfer";
import type { WorkspaceInfo } from "./workspace";
import { isGitInstalled, setupDeployKey, gitSync } from "./git";
import { setupPM2, startOrReload, isPM2Installed } from "./pm2";
import {
  configureCaddy,
  isCaddyInstalled,
  printDNSInstructions,
  checkPortConflict,
} from "./caddy";
import {
  Spinner,
  log,
  printHeader,
  formatKV,
  generateReleaseId,
} from "./utils";
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

  const useGit = !!target.git;

  // Check rsync is available (only needed for non-git deployments)
  if (!useGit && !(await checkRsync())) {
    throw new Error(
      "rsync is not installed. Please install rsync to continue."
    );
  }

  let ssh: SSHClient | null = null;

  try {
    // 1. Connect to server
    if (!dryRun) {
      ssh = new SSHClient(target);

      // Check if we need passphrase before starting spinner
      // This ensures clean prompt without spinner interference
      if (ssh.needsPassphrasePrompt()) {
        await ssh.promptForPassphrase();
      }

      spinner.start("Connecting to server...");
      await ssh.connect();
    } else {
      spinner.start("Connecting to server...");
    }
    spinner.succeed(`Connected to ${target.host}`);

    // 2. Pre-flight checks
    spinner.start("Running pre-flight checks...");
    if (ssh) {
      await preflightChecks(ssh, target, spinner);
    }
    spinner.succeed("Pre-flight checks passed");

    // 3. Prepare release directory
    spinner.start("Preparing release directory...");
    if (ssh) {
      await ssh.exec(`mkdir -p ${releaseDir}`);
      await ssh.exec(`mkdir -p ${target.deployPath}/shared`);
      await ssh.exec(`mkdir -p ${target.deployPath}/logs`);
    }
    spinner.succeed("Release directory ready");

    // 4. Transfer files (git clone OR rsync)
    let workspace: WorkspaceInfo | null = null;

    if (useGit && ssh) {
      // Git-based deployment
      spinner.start("Cloning repository...");
      if (!dryRun) {
        // Setup deploy key if needed (first deploy only)
        if (target.git!.deployKey) {
          const keyExists = await ssh.pathExists(
            `${target.deployPath}/.ssh/deploy_key`
          );
          if (!keyExists) {
            await setupDeployKey(ssh, target.git!.deployKey, target.deployPath);
          }
        }
        await gitSync(ssh, target, releaseDir);
      }
      spinner.succeed(`Cloned ${target.git!.branch} branch`);
    } else {
      // Rsync-based deployment
      spinner.start("Transferring files...");
      if (!dryRun) {
        const result = await transferFiles(target, releaseDir, verbose);
        workspace = result.workspace;
      }
      if (workspace) {
        spinner.succeed(`Files transferred (monorepo: ${workspace.appPath})`);
      } else {
        spinner.succeed("Files transferred");
      }
    }

    // 5. Install dependencies on server
    // For monorepos, install at root to resolve workspace dependencies
    if (install && ssh) {
      spinner.start("Installing dependencies...");
      if (!dryRun) {
        const result = await ssh.exec(`cd ${releaseDir} && bun install`);
        if (result.code !== 0) {
          throw new Error(`Failed to install dependencies: ${result.stderr}`);
        }
      }
      spinner.succeed("Dependencies installed");
    }

    // 6. Build on server
    // For monorepos, build in the app subdirectory
    if (build && ssh) {
      spinner.start("Building application...");
      if (!dryRun) {
        const buildDir = workspace ? `${releaseDir}/${workspace.appPath}` : releaseDir;
        const result = await ssh.exec(`cd ${buildDir} && bun run build`);
        if (result.code !== 0) {
          throw new Error(`Failed to build application: ${result.stderr}`);
        }
      }
      spinner.succeed("Build complete");
    }

    // 7. Link shared files (e.g., .env)
    // For monorepos, link .env to the app subdirectory
    spinner.start("Linking shared files...");
    if (ssh) {
      const sharedEnv = `${target.deployPath}/shared/.env`;
      const hasSharedEnv = await ssh.pathExists(sharedEnv);
      if (hasSharedEnv) {
        const envTargetDir = workspace ? `${releaseDir}/${workspace.appPath}` : releaseDir;
        await ssh.exec(`ln -sf ${sharedEnv} ${envTargetDir}/.env`);
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
    // For monorepos, PM2 runs from the app subdirectory
    if (restart && ssh) {
      spinner.start("Configuring PM2...");
      if (!dryRun) {
        await setupPM2(ssh, target, workspace?.appPath);
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
        // Check PM2 logs for diagnostic info
        const logResult = await ssh.exec(
          `pm2 logs ${target.name} --nostream --lines 15 2>&1`
        );
        const logs = logResult.stdout || "";

        // Check for common issues
        if (logs.includes("0 routes") || logs.includes("(0 routes)")) {
          spinner.fail(
            "Health check failed - app started with 0 routes. Check that source files were transferred correctly."
          );
        } else if (logs.includes("Error") || logs.includes("error")) {
          spinner.fail("Health check failed - check PM2 logs for errors");
        } else {
          spinner.warn("Health check failed - app may still be starting");
        }
      } else {
        spinner.succeed("Health check passed");
      }
    } else {
      spinner.succeed("Health check skipped (dry run)");
    }

    // 11. Configure Caddy if domain is set
    if (target.domain && ssh && !dryRun) {
      spinner.start("Configuring Caddy...");
      const { changed, isFirstDeploy } = await configureCaddy(ssh, target);

      spinner.succeed(changed ? "Caddy configured" : "Caddy unchanged");

      if (changed && isFirstDeploy) {
        const serverIP = await ssh.getPublicIP();
        printDNSInstructions(target.domain, serverIP);
      }
    } else if (target.domain && dryRun) {
      spinner.start("Configuring Caddy...");
      spinner.succeed("Caddy configured (dry run)");
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
    } else {
      // Check for port conflicts with other apps
      const conflict = await checkPortConflict(ssh, target);
      if (conflict) {
        throw new Error(
          `Port ${target.port} is already used by "${conflict}".\n` +
            `Set a different port in bunbox.deploy.ts:\n\n` +
            `  port: ${target.port + 1}`
        );
      }
    }
  }

  // Check git is installed if using git deployment
  if (target.git) {
    const hasGit = await isGitInstalled(ssh);
    if (!hasGit) {
      throw new Error(
        "Git is not installed on the server. Install git or use rsync deployment."
      );
    }
  }
}

/**
 * Check if the application is healthy
 * Returns true only if the app responds with a non-404 status code
 */
async function healthCheck(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<boolean> {
  try {
    // First try /api/health endpoint
    const healthResult = await ssh.exec(
      `curl -s -o /dev/null -w '%{http_code}' http://localhost:${target.port}/api/health 2>/dev/null`
    );

    let statusCode = parseInt(healthResult.stdout.trim(), 10);

    // If /api/health returns 404, fall back to checking /
    if (statusCode === 404 || isNaN(statusCode)) {
      const rootResult = await ssh.exec(
        `curl -s -o /dev/null -w '%{http_code}' http://localhost:${target.port}/ 2>/dev/null`
      );
      statusCode = parseInt(rootResult.stdout.trim(), 10);
    }

    // Consider 2xx and 3xx as healthy, 404 and other 4xx/5xx as unhealthy
    return statusCode >= 200 && statusCode < 400;
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
  console.log(
    pc.dim(`    bunbox-deploy rollback - Rollback to previous release`)
  );
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
        `Cannot rollback ${steps} version(s). Only ${
          releases.length - currentIndex - 1
        } older release(s) available.`
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
    const currentRelease =
      releaseResult.stdout.trim().split("/").pop() || "unknown";
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
        console.log(
          `    ${prefix} ${release}${isCurrent ? pc.dim(" (current)") : ""}`
        );
      }
    }

    console.log();
  } finally {
    ssh.disconnect();
  }
}
