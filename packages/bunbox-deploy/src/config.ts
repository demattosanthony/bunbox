/**
 * Configuration loading and validation
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

export interface DeployTarget {
  // SSH connection
  host: string;
  sshPort?: number;
  username: string;
  privateKey: string;

  // Remote paths
  deployPath: string;

  // Application settings
  name: string;
  port?: number;
  env?: Record<string, string>;

  // Domain for Caddy (optional)
  domain?: string;

  // Deployment options
  keepReleases?: number;
  exclude?: string[];
}

export interface DeployConfig {
  defaultTarget?: string;
  targets: Record<string, DeployTarget>;
}

export interface ResolvedTarget extends DeployTarget {
  sshPort: number;
  port: number;
  keepReleases: number;
  exclude: string[];
}

/**
 * Helper to define deploy config with type safety
 */
export function defineDeployConfig(config: DeployConfig): DeployConfig {
  return config;
}

/**
 * Default config file names to search for
 */
const CONFIG_FILES = [
  "bunbox.deploy.ts",
  "bunbox.deploy.js",
  "deploy.config.ts",
  "deploy.config.js",
];

/**
 * Load deploy configuration from file
 */
export async function loadConfig(
  configPath?: string
): Promise<DeployConfig | null> {
  const cwd = process.cwd();

  // If explicit path provided, use it
  if (configPath) {
    const fullPath = resolve(cwd, configPath);
    if (!existsSync(fullPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    return importConfig(fullPath);
  }

  // Search for config file
  for (const filename of CONFIG_FILES) {
    const fullPath = resolve(cwd, filename);
    if (existsSync(fullPath)) {
      return importConfig(fullPath);
    }
  }

  return null;
}

async function importConfig(path: string): Promise<DeployConfig> {
  const module = await import(path);
  const config = module.default || module;

  validateConfig(config);
  return config;
}

/**
 * Validate configuration structure
 */
function validateConfig(config: unknown): asserts config is DeployConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid config: must be an object");
  }

  const c = config as Record<string, unknown>;

  if (!c.targets || typeof c.targets !== "object") {
    throw new Error("Invalid config: must have 'targets' object");
  }

  for (const [name, target] of Object.entries(
    c.targets as Record<string, unknown>
  )) {
    validateTarget(name, target);
  }
}

function validateTarget(name: string, target: unknown): void {
  if (!target || typeof target !== "object") {
    throw new Error(`Invalid target '${name}': must be an object`);
  }

  const t = target as Record<string, unknown>;
  const required = ["host", "username", "privateKey", "deployPath", "name"];

  for (const field of required) {
    if (!t[field] || typeof t[field] !== "string") {
      throw new Error(
        `Invalid target '${name}': missing or invalid '${field}'`
      );
    }
  }
}

/**
 * Resolve a target by name with defaults applied
 */
export function resolveTarget(
  config: DeployConfig,
  targetName?: string
): { name: string; target: ResolvedTarget } {
  // Determine target name
  const name = targetName || config.defaultTarget || Object.keys(config.targets)[0];

  if (!name) {
    throw new Error("No target specified and no default target configured");
  }

  const target = config.targets[name];
  if (!target) {
    throw new Error(
      `Unknown target: ${name}. Available: ${Object.keys(config.targets).join(", ")}`
    );
  }

  // Apply defaults
  const resolved: ResolvedTarget = {
    ...target,
    sshPort: target.sshPort ?? 22,
    port: target.port ?? 3000,
    keepReleases: target.keepReleases ?? 5,
    exclude: target.exclude ?? [
      "node_modules",
      ".git",
      ".env.local",
      ".env.development",
      "*.log",
    ],
  };

  // Resolve privateKey path
  resolved.privateKey = resolved.privateKey.replace("~", homedir());

  // Resolve environment variable placeholders in env
  if (resolved.env) {
    resolved.env = resolveEnvVars(resolved.env);
  }

  return { name, target: resolved };
}

/**
 * Replace ${VAR} placeholders with actual environment values
 */
function resolveEnvVars(env: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    resolved[key] = value.replace(/\$\{(\w+)\}/g, (_, varName) => {
      return process.env[varName] || "";
    });
  }

  return resolved;
}

/**
 * Generate a sample config file content
 */
export function generateConfigTemplate(): string {
  return `import { defineDeployConfig } from "bunbox-deploy";

export default defineDeployConfig({
  // Default target when none specified
  defaultTarget: "production",

  targets: {
    production: {
      // SSH connection
      host: "your-server.com",
      username: "deploy",
      privateKey: "~/.ssh/id_ed25519",

      // Where to deploy on the server
      deployPath: "/var/www/myapp",

      // PM2 process name
      name: "myapp",

      // App port (default: 3000)
      port: 3000,

      // Domain for automatic HTTPS via Caddy (optional)
      // domain: "myapp.com",

      // Environment variables
      env: {
        NODE_ENV: "production",
        // Use \${VAR} to reference local env vars
        // DATABASE_URL: "\${DATABASE_URL}",
      },

      // Number of releases to keep for rollback (default: 5)
      keepReleases: 5,
    },

    // Add more targets as needed:
    // staging: {
    //   host: "staging.your-server.com",
    //   ...
    // },
  },
});
`;
}
