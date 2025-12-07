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
import { createSSHClient } from "./ssh";
import { getLogs } from "./pm2";
import { installCaddy, isCaddyInstalled } from "./caddy";
import { isGitInstalled, setupDeployKey, testRepoAccess } from "./git";
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

      case "setup-git":
        await setupGitCommand(options);
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
  console.log(
    `    ${pc.cyan("bunbox-deploy setup production")}   # Setup server`
  );
  console.log(
    `    ${pc.cyan("bunbox-deploy deploy production")}  # Deploy app`
  );
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
      const result = await ssh.exec("curl -fsSL https://bun.sh/install | bash");
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
    console.log(
      `    ${pc.cyan("bunbox-deploy deploy")} ${name}  # Deploy your app`
    );
    console.log();

    if (target.domain) {
      const serverIP = await ssh.getPublicIP();
      console.log(pc.dim("  Don't forget to configure DNS:"));
      console.log(
        `    Point ${pc.bold(target.domain)} to ${pc.bold(serverIP)}`
      );
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
      console.log(
        pc.dim(`Streaming logs for ${target.name}... (Ctrl+C to exit)`)
      );
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

/**
 * Setup git deployment - test repo access and setup deploy key
 */
async function setupGitCommand(options: CLIOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (!config) {
    throw new Error("No config file found");
  }

  const targetName = options.positional[0];
  const { name, target } = resolveTarget(config, targetName);

  if (!target.git) {
    throw new Error(
      `Target '${name}' does not have git deployment configured.\n` +
        "Add a 'git' section to your config with repo URL."
    );
  }

  const spinner = new Spinner();

  printHeader(`Setup Git Deployment: ${name}`);
  console.log(formatKV("Server", `${target.username}@${target.host}`));
  console.log(formatKV("Repo", target.git.repo));
  console.log(formatKV("Branch", target.git.branch));
  console.log();

  const ssh = await createSSHClient(target);

  try {
    // Check git is installed on server
    spinner.start("Checking git installation...");
    const hasGit = await isGitInstalled(ssh);
    if (!hasGit) {
      spinner.fail("Git not installed on server");
      console.log();
      console.log(pc.dim("  Install git on the server:"));
      console.log(`    ${pc.cyan("sudo apt install git")}  # Debian/Ubuntu`);
      console.log(`    ${pc.cyan("sudo yum install git")}  # CentOS/RHEL`);
      console.log();
      return;
    }
    spinner.succeed("Git installed");

    // Setup deploy key if configured
    if (target.git.deployKey) {
      spinner.start("Setting up deploy key...");
      await setupDeployKey(ssh, target.git.deployKey, target.deployPath);
      spinner.succeed("Deploy key configured");

      console.log();
      console.log(pc.dim("  Add this deploy key to your repository:"));
      console.log(pc.dim("  GitHub: Settings → Deploy keys → Add deploy key"));
      console.log(pc.dim("  GitLab: Settings → Repository → Deploy keys"));
      console.log();

      // Show the public key
      const pubKeyPath = target.git.deployKey + ".pub";
      try {
        const pubKey = await Bun.file(pubKeyPath).text();
        console.log(pc.bold("  Public key:"));
        console.log(`    ${pubKey.trim()}`);
        console.log();
      } catch {
        console.log(
          pc.yellow(`  Could not read public key from ${pubKeyPath}`)
        );
        console.log(
          pc.dim(
            "  Generate one with: ssh-keygen -t ed25519 -f ~/.ssh/deploy_key"
          )
        );
        console.log();
      }
    }

    // Test repo access
    spinner.start("Testing repository access...");
    const result = await testRepoAccess(ssh, target);

    if (result.success) {
      spinner.succeed("Repository accessible");
      console.log();
      log.success("Git deployment is ready!");
      console.log();
      console.log(pc.dim("  Deploy with:"));
      console.log(`    ${pc.cyan(`bunbox-deploy deploy ${name}`)}`);
      console.log();
    } else {
      spinner.fail("Cannot access repository");
      console.log();
      console.log(pc.red("  Error: ") + (result.error || "Unknown error"));
      console.log();

      if (target.git.repo.startsWith("git@")) {
        console.log(pc.dim("  For SSH repos, ensure:"));
        console.log(pc.dim("  1. Deploy key is added to the repository"));
        console.log(pc.dim("  2. The key has read access"));
      } else if (target.git.repo.startsWith("https://")) {
        if (!target.git.token) {
          console.log(
            pc.dim("  For private HTTPS repos, add a token to your config:")
          );
          console.log(
            pc.dim('    git: { repo: "...", token: "${GITHUB_TOKEN}" }')
          );
        } else {
          console.log(
            pc.dim("  Check that your token has repository read access")
          );
        }
      }
      console.log();
    }
  } finally {
    ssh.disconnect();
  }
}
