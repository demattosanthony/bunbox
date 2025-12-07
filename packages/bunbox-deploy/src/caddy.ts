/**
 * Caddy reverse proxy configuration
 */

import type { SSHClient } from "./ssh";
import type { ResolvedTarget } from "./config";
import pc from "picocolors";

/**
 * Metadata stored on server to track app state
 */
interface BunboxMeta {
  appName: string;
  domain?: string;
  port: number;
}

/**
 * Generate Caddyfile configuration for an app
 */
export function generateCaddyConfig(target: ResolvedTarget): string {
  if (!target.domain) {
    throw new Error("No domain configured for Caddy");
  }

  return `# ${target.name} - Bunbox app
${target.domain} {
    reverse_proxy localhost:${target.port}
}
`;
}

/**
 * Check if Caddy is installed
 */
export async function isCaddyInstalled(ssh: SSHClient): Promise<boolean> {
  return ssh.commandExists("caddy");
}

/**
 * Check if port is already used by another app
 * Returns the app name if conflict exists, null otherwise
 */
export async function checkPortConflict(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<string | null> {
  const result = await ssh.exec(
    `grep -l "localhost:${target.port}" /etc/caddy/sites/*.caddy 2>/dev/null | head -1`
  );

  if (result.code === 0 && result.stdout.trim()) {
    const file = result.stdout.trim();
    const appName = file.match(/sites\/(.+)\.caddy$/)?.[1];
    // Allow same app to keep its port
    if (appName && appName !== target.name) {
      return appName;
    }
  }
  return null;
}

/**
 * Install Caddy on Debian/Ubuntu
 */
export async function installCaddy(ssh: SSHClient): Promise<void> {
  const commands = [
    "apt-get update",
    "apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl",
    "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg",
    "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list",
    "apt-get update",
    "apt-get install -y caddy",
  ];

  for (const cmd of commands) {
    const result = await ssh.exec(cmd, { sudo: true });
    if (result.code !== 0) {
      throw new Error(`Failed to install Caddy: ${result.stderr}`);
    }
  }

  // Enable and start Caddy
  await ssh.exec("systemctl enable caddy", { sudo: true });
  await ssh.exec("systemctl start caddy", { sudo: true });
}

/**
 * Configure Caddy for the application
 * Handles metadata tracking, old config cleanup, and config updates
 * Returns { changed: true if config was updated, isFirstDeploy: true if no prior deploy }
 */
export async function configureCaddy(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<{ changed: boolean; isFirstDeploy: boolean }> {
  if (!target.domain) {
    return { changed: false, isFirstDeploy: false };
  }

  const sitesDir = "/etc/caddy/sites";
  const configPath = `${sitesDir}/${target.name}.caddy`;
  const metaPath = `${target.deployPath}/.bunbox-meta.json`;
  const logsDir = `${target.deployPath}/logs`;

  // Create sites directory if needed
  await ssh.exec(`mkdir -p ${sitesDir}`, { sudo: true });

  // Read existing metadata to check for renames and first deploy
  const metaResult = await ssh.exec(`cat ${metaPath} 2>/dev/null`);
  const isFirstDeploy = metaResult.code !== 0;
  let oldMeta: BunboxMeta | null = null;

  if (!isFirstDeploy) {
    try {
      oldMeta = JSON.parse(metaResult.stdout);
    } catch {
      // Invalid JSON, treat as first deploy
    }
  }

  // Cleanup old config if app was renamed
  if (oldMeta && oldMeta.appName && oldMeta.appName !== target.name) {
    await ssh.exec(`rm -f /etc/caddy/sites/${oldMeta.appName}.caddy`, {
      sudo: true,
    });
  }

  // Ensure main Caddyfile imports the sites directory (always check this)
  const importLine = "import /etc/caddy/sites/*.caddy";
  const checkResult = await ssh.exec(
    `grep -F -q "${importLine}" /etc/caddy/Caddyfile`
  );

  let importAdded = false;
  if (checkResult.code !== 0) {
    // Use double quotes to avoid breaking bash -c '...' wrapper
    await ssh.exec(`sed -i "1i ${importLine}" /etc/caddy/Caddyfile`, {
      sudo: true,
    });
    importAdded = true;
  }

  // Check if site config needs updating
  const newConfig = generateCaddyConfig(target);
  const existingResult = await ssh.exec(`cat ${configPath} 2>/dev/null`);
  const existingConfig = existingResult.code === 0 ? existingResult.stdout : "";
  const siteConfigChanged = existingConfig.trim() !== newConfig.trim();

  if (siteConfigChanged) {
    // Create logs directory with caddy ownership
    await ssh.exec(`mkdir -p ${logsDir}`, { sudo: true });
    await ssh.exec(`chown caddy:caddy ${logsDir}`, { sudo: true });

    // Write the new config
    const escaped = newConfig.replace(/"/g, '\\"').replace(/\$/g, "\\$");
    await ssh.exec(`echo "${escaped}" | sudo tee ${configPath}`, {
      sudo: false,
    });
  }

  // If anything changed, validate and reload
  if (importAdded || siteConfigChanged) {
    // Validate config
    const validateResult = await ssh.exec(
      "caddy validate --config /etc/caddy/Caddyfile",
      { sudo: true }
    );
    if (validateResult.code !== 0) {
      throw new Error(`Invalid Caddy config: ${validateResult.stderr}`);
    }

    // Reload Caddy
    await ssh.exec("systemctl reload caddy", { sudo: true });
  }

  // Save metadata
  await saveMetadata(ssh, metaPath, target);

  return { changed: importAdded || siteConfigChanged, isFirstDeploy };
}

/**
 * Save deployment metadata (internal helper)
 */
async function saveMetadata(
  ssh: SSHClient,
  metaPath: string,
  target: ResolvedTarget
): Promise<void> {
  const meta: BunboxMeta = {
    appName: target.name,
    domain: target.domain,
    port: target.port,
  };
  const escaped = JSON.stringify(meta).replace(/"/g, '\\"');
  await ssh.exec(`echo "${escaped}" > ${metaPath}`);
}

/**
 * Print DNS configuration instructions
 */
export function printDNSInstructions(domain: string, serverIP: string): void {
  const width = Math.max(42, serverIP.length + 14);
  const line = "─".repeat(width);
  const pad = (s: string) => s.padEnd(width - 4);

  console.log();
  console.log(pc.bold(pc.cyan("  DNS Configuration Required")));
  console.log();
  console.log(pc.dim(`  ┌${line}┐`));
  console.log(`  │ ${pad("Type:  " + pc.bold("A"))} │`);
  console.log(`  │ ${pad("Name:  " + pc.bold("@") + " (or subdomain)")} │`);
  console.log(`  │ ${pad("Value: " + pc.bold(serverIP))} │`);
  console.log(pc.dim(`  └${line}┘`));
  console.log();
  console.log(pc.dim("  Caddy will auto-provision HTTPS via Let's Encrypt"));
  console.log(pc.dim("  once DNS propagates (may take a few minutes)."));
  console.log();
  console.log(
    `  Your app will be live at: ${pc.bold(pc.green(`https://${domain}`))}`
  );
  console.log();
}
