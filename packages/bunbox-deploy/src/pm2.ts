/**
 * PM2 process management
 */

import type { SSHClient } from "./ssh";
import type { ResolvedTarget } from "./config";

/**
 * Generate PM2 ecosystem config
 */
export function generateEcosystemConfig(target: ResolvedTarget): string {
  const envLines = Object.entries(target.env || {})
    .map(([key, value]) => `      ${key}: "${value}",`)
    .join("\n");

  return `module.exports = {
  apps: [{
    name: "${target.name}",
    script: "bunbox",
    args: "start",
    cwd: "${target.deployPath}/current",
    interpreter: "bun",
    env: {
      PORT: ${target.port},
      NODE_ENV: "production",
${envLines}
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "500M",
    error_file: "${target.deployPath}/logs/error.log",
    out_file: "${target.deployPath}/logs/output.log",
    merge_logs: true,
  }]
};
`;
}

/**
 * Check if PM2 is installed
 */
export async function isPM2Installed(ssh: SSHClient): Promise<boolean> {
  return ssh.commandExists("pm2");
}

/**
 * Install PM2 globally
 */
export async function installPM2(ssh: SSHClient): Promise<void> {
  const result = await ssh.exec("npm install -g pm2");
  if (result.code !== 0) {
    throw new Error(`Failed to install PM2: ${result.stderr}`);
  }
}

/**
 * Setup PM2 for the application
 */
export async function setupPM2(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<void> {
  // Create logs directory
  await ssh.exec(`mkdir -p ${target.deployPath}/logs`);

  // Generate and upload ecosystem config
  const config = generateEcosystemConfig(target);
  const configPath = `${target.deployPath}/ecosystem.config.js`;

  // Write config via echo (simple approach)
  const escaped = config.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  await ssh.exec(`echo "${escaped}" > ${configPath}`);
}

/**
 * Check if the app is already running in PM2
 */
export async function isAppRunning(
  ssh: SSHClient,
  appName: string
): Promise<boolean> {
  const result = await ssh.exec(`pm2 describe ${appName}`);
  return result.code === 0;
}

/**
 * Start or reload the application
 */
export async function startOrReload(
  ssh: SSHClient,
  target: ResolvedTarget
): Promise<void> {
  const isRunning = await isAppRunning(ssh, target.name);

  if (isRunning) {
    // Reload existing process (zero-downtime)
    const result = await ssh.exec(`pm2 reload ${target.name} --update-env`);
    if (result.code !== 0) {
      throw new Error(`Failed to reload app: ${result.stderr}`);
    }
  } else {
    // Start new process
    const result = await ssh.exec(
      `cd ${target.deployPath} && pm2 start ecosystem.config.js`
    );
    if (result.code !== 0) {
      throw new Error(`Failed to start app: ${result.stderr}`);
    }

    // Save PM2 process list for auto-restart on reboot
    await ssh.exec("pm2 save");
  }
}

/**
 * Stop the application
 */
export async function stopApp(
  ssh: SSHClient,
  appName: string
): Promise<void> {
  await ssh.exec(`pm2 stop ${appName}`);
}

/**
 * Get application status
 */
export async function getAppStatus(
  ssh: SSHClient,
  appName: string
): Promise<{ status: string; uptime: string; memory: string; cpu: string } | null> {
  const result = await ssh.exec(`pm2 jlist`);
  if (result.code !== 0) return null;

  try {
    const processes = JSON.parse(result.stdout);
    const app = processes.find((p: { name: string }) => p.name === appName);

    if (!app) return null;

    return {
      status: app.pm2_env.status,
      uptime: formatUptime(app.pm2_env.pm_uptime),
      memory: formatBytes(app.monit.memory),
      cpu: `${app.monit.cpu}%`,
    };
  } catch {
    return null;
  }
}

/**
 * Get application logs
 */
export async function getLogs(
  ssh: SSHClient,
  appName: string,
  lines: number = 100
): Promise<string> {
  const result = await ssh.exec(`pm2 logs ${appName} --nostream --lines ${lines}`);
  return result.stdout || result.stderr;
}

function formatUptime(startTime: number): string {
  const diff = Date.now() - startTime;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)}${units[i]}`;
}
