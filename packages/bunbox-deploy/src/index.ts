/**
 * bunbox-deploy - Deploy Bunbox apps to VPS servers
 */

import { writeFileSync, existsSync } from "fs";
import pc from "picocolors";

import {
  loadConfig,
  resolveTarget,
  generateConfigTemplate,
  defineDeployConfig,
  type DeployConfig,
  type DeployTarget,
  type ResolvedTarget,
} from "./config";

import { deploy, rollback, status } from "./deploy";
import { SSHClient, createSSHClient } from "./ssh";
import { getLogs, getAppStatus } from "./pm2";
import { installCaddy, isCaddyInstalled } from "./caddy";
import { Spinner, log, printHeader, formatKV } from "./utils";

// Re-export for users
export { defineDeployConfig };
export type { DeployConfig, DeployTarget, ResolvedTarget };

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

/**
 * Main CLI entry point
 */
export async function runCLI(
  command: string,
  options: CLIOptions
): Promise<void> {
  try {
    switch (command) {
      case "init":
        await initCommand();
        break;

      case "deploy":
        await deployCommand(options);
        break;

      case "rollback":
        await rollbackCommand(options);
        break;

      case "status":
        await statusCommand(options);
        break;

      case "setup":
        await setupCommand(options);
        break;

      case "logs":
        await logsCommand(options);
        break;

      case "ssh":
        await sshCommand(options);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error();
    log.error(error instanceof Error ? error.message : String(error));
    console.error();
    process.exit(1);
  }
}

/**
 * Initialize a new deployment config file
 */
async function initCommand(): Promise<void> {
  const configPath = "bunbox.deploy.ts";

  if (existsSync(configPath)) {
    log.error(`${configPath} already exists`);
    process.exit(1);
  }

  const template = generateConfigTemplate();
  writeFileSync(configPath, template);

  console.log();
  log.success(`Created ${pc.bold(configPath)}`);
  console.log();
  console.log(pc.dim("  Edit the file to configure your deployment targets."));
  console.log(pc.dim("  Then run:"));
  console.log();
  console.log(`    ${pc.cyan("bunbox-deploy setup production")}   # Setup server`);
  console.log(`    ${pc.cyan("bunbox-deploy deploy production")}  # Deploy app`);
  console.log();
}

/**
 * Deploy to a target
 */
async function deployCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error(
      "No config file found. Run 'bunbox-deploy init' to create one."
    );
  }

  const targetName = options.positional[0];
  const { name, target } = resolveTarget(config, targetName);

  await deploy(target, name, {
    build: options.build,
    install: options.install,
    restart: options.restart,
    verbose: options.verbose,
    dryRun: options.dryRun,
    yes: options.yes,
  });
}

/**
 * Rollback to a previous release
 */
async function rollbackCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error("No config file found");
  }

  const targetName = options.positional[0];
  const { name, target } = resolveTarget(config, targetName);

  await rollback(target, name);
}

/**
 * Show deployment status
 */
async function statusCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error("No config file found");
  }

  const targetName = options.positional[0];
  const { name, target } = resolveTarget(config, targetName);

  await status(target, name);
}

/**
 * Setup a server with Bun, PM2, and optionally Caddy
 */
async function setupCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error("No config file found");
  }

  const targetName = options.positional[0];
  const { name, target } = resolveTarget(config, targetName);

  const spinner = new Spinner();

  printHeader(`Setting up ${name}`);
  console.log(formatKV("Server", `${target.username}@${target.host}`));
  console.log();

  const ssh = await createSSHClient(target);

  try {
    // Check/Install Bun
    spinner.start("Checking Bun...");
    const hasBun = await ssh.commandExists("bun");
    if (hasBun) {
      const version = await ssh.exec("bun --version");
      spinner.succeed(`Bun ${version.stdout.trim()} installed`);
    } else {
      spinner.update("Installing Bun...");
      const result = await ssh.exec(
        "curl -fsSL https://bun.sh/install | bash"
      );
      if (result.code !== 0) {
        throw new Error(`Failed to install Bun: ${result.stderr}`);
      }
      // Source the updated PATH
      await ssh.exec('export PATH="$HOME/.bun/bin:$PATH"');
      spinner.succeed("Bun installed");
    }

    // Check/Install PM2
    spinner.start("Checking PM2...");
    const hasPM2 = await ssh.commandExists("pm2");
    if (hasPM2) {
      spinner.succeed("PM2 installed");
    } else {
      spinner.update("Installing PM2...");
      const result = await ssh.exec("npm install -g pm2");
      if (result.code !== 0) {
        throw new Error(`Failed to install PM2: ${result.stderr}`);
      }
      // Setup PM2 to start on boot
      await ssh.exec("pm2 startup", { sudo: true });
      spinner.succeed("PM2 installed");
    }

    // Check/Install Caddy if domain is configured
    if (target.domain) {
      spinner.start("Checking Caddy...");
      const hasCaddy = await isCaddyInstalled(ssh);
      if (hasCaddy) {
        spinner.succeed("Caddy installed");
      } else {
        spinner.update("Installing Caddy...");
        await installCaddy(ssh);
        spinner.succeed("Caddy installed");
      }
    }

    // Create deployment directory
    spinner.start("Creating deployment directory...");
    await ssh.exec(`mkdir -p ${target.deployPath}/releases`);
    await ssh.exec(`mkdir -p ${target.deployPath}/shared`);
    await ssh.exec(`mkdir -p ${target.deployPath}/logs`);
    spinner.succeed("Deployment directory ready");

    console.log();
    log.success("Server setup complete!");
    console.log();
    console.log(pc.dim("  Next steps:"));
    console.log(`    ${pc.cyan("bunbox-deploy deploy")} ${name}  # Deploy your app`);
    console.log();

    if (target.domain) {
      const serverIP = await ssh.getPublicIP();
      console.log(pc.dim("  Don't forget to configure DNS:"));
      console.log(`    Point ${pc.bold(target.domain)} to ${pc.bold(serverIP)}`);
      console.log();
    }
  } finally {
    ssh.disconnect();
  }
}

/**
 * View application logs
 */
async function logsCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error("No config file found");
  }

  const targetName = options.positional[0];
  const { target } = resolveTarget(config, targetName);

  const ssh = await createSSHClient(target);

  try {
    if (options.follow) {
      // Stream logs with pm2 logs --follow
      console.log(pc.dim(`Streaming logs for ${target.name}... (Ctrl+C to exit)`));
      console.log();

      // Use interactive shell for streaming
      const proc = Bun.spawn(
        [
          "ssh",
          "-i",
          target.privateKey,
          `${target.username}@${target.host}`,
          `pm2 logs ${target.name}`,
        ],
        {
          stdout: "inherit",
          stderr: "inherit",
          stdin: "inherit",
        }
      );

      await proc.exited;
    } else {
      const logs = await getLogs(ssh, target.name, 100);
      console.log(logs);
    }
  } finally {
    ssh.disconnect();
  }
}

/**
 * Open SSH session to the server
 */
async function sshCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error("No config file found");
  }

  const targetName = options.positional[0];
  const { target } = resolveTarget(config, targetName);

  console.log(pc.dim(`Connecting to ${target.username}@${target.host}...`));

  // Use native ssh command for better terminal support
  const proc = Bun.spawn(
    ["ssh", "-i", target.privateKey, `${target.username}@${target.host}`],
    {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    }
  );

  await proc.exited;
}
