/**
 * Caddy reverse proxy configuration
 */

import type { SSHClient } from "./ssh";
import type { ResolvedTarget } from "./config";
import pc from "picocolors";

/**
 * Generate Caddyfile configuration for an app
 */
export function generateCaddyConfig(target: ResolvedTarget): string {
  if (!target.domain) {
    throw new Error("No domain configured for Caddy");
  }

  return `# ${target.name} - Bunbox app
${target.domain} {
    reverse_proxy localhost:${target.port} {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    encode gzip

    log {
        output file ${target.deployPath}/logs/access.log
        format json
    }
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
 */
export async function configureCaddy(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<void> {
  if (!target.domain) return;

  const config = generateCaddyConfig(target);
  const sitesDir = "/etc/caddy/sites";
  const configPath = `${sitesDir}/${target.name}.caddy`;

  // Create sites directory if it doesn't exist
  await ssh.exec(`mkdir -p ${sitesDir}`, { sudo: true });

  // Write the config file
  const escaped = config.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  await ssh.exec(`echo "${escaped}" | sudo tee ${configPath}`, { sudo: false });

  // Ensure main Caddyfile imports the sites directory
  const importLine = "import /etc/caddy/sites/*.caddy";
  const checkResult = await ssh.exec(`grep -q "${importLine}" /etc/caddy/Caddyfile`);

  if (checkResult.code !== 0) {
    // Add import line to Caddyfile
    await ssh.exec(
      `echo '\\n${importLine}' | sudo tee -a /etc/caddy/Caddyfile`,
      { sudo: false }
    );
  }

  // Validate Caddy config
  const validateResult = await ssh.exec("caddy validate --config /etc/caddy/Caddyfile", {
    sudo: true,
  });
  if (validateResult.code !== 0) {
    throw new Error(`Invalid Caddy config: ${validateResult.stderr}`);
  }

  // Reload Caddy
  await ssh.exec("systemctl reload caddy", { sudo: true });
}

/**
 * Check if domain is already configured in Caddy
 */
export async function isDomainConfigured(
  ssh: SSHClient,
  domain: string
): Promise<boolean> {
  const result = await ssh.exec(`grep -r "${domain}" /etc/caddy/`);
  return result.code === 0;
}

/**
 * Print DNS configuration instructions
 */
export function printDNSInstructions(domain: string, serverIP: string): void {
  console.log();
  console.log(pc.bold(pc.cyan("  DNS Configuration Required")));
  console.log();
  console.log("  Add this DNS record to your domain provider:");
  console.log();
  console.log(pc.dim("  ┌────────────────────────────────────────┐"));
  console.log(`  │  Type:  ${pc.bold("A")}                               │`);
  console.log(`  │  Name:  ${pc.bold("@")} (or ${domain.split(".")[0]})                │`);
  console.log(`  │  Value: ${pc.bold(serverIP)}                  │`);
  console.log(pc.dim("  └────────────────────────────────────────┘"));
  console.log();
  console.log(
    pc.dim("  Caddy will automatically provision HTTPS via Let's Encrypt")
  );
  console.log(pc.dim("  once DNS propagates (may take a few minutes to hours)."));
  console.log();
  console.log(`  Your app will be live at: ${pc.bold(pc.green(`https://${domain}`))}`);
  console.log();
}
