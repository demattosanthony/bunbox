/**
 * Configuration management for Bunbox
 */

import { join } from "path";

export interface BunboxConfig {
  port?: number;
  hostname?: string;
  appDir?: string;
  wsDir?: string;
  socketsDir?: string;
  publicDir?: string;
}

export interface ResolvedBunboxConfig {
  port: number;
  hostname: string;
  appDir: string;
  wsDir: string;
  socketsDir: string;
  publicDir: string;
  development: boolean;
}

/**
 * Default configuration
 */
const defaults: ResolvedBunboxConfig = {
  port: 3000,
  hostname: "localhost",
  appDir: join(process.cwd(), "app"),
  wsDir: join(process.cwd(), "app", "ws"),
  socketsDir: join(process.cwd(), "app", "sockets"),
  publicDir: join(process.cwd(), "public"),
  development: true,
};

/**
 * Load configuration file from project root if it exists
 */
async function loadConfigFile(): Promise<BunboxConfig> {
  const configPath = join(process.cwd(), "bunbox.config.ts");

  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      const module = await import(configPath);
      return module.default || {};
    }
  } catch (error) {
    // Config file doesn't exist or has errors, return empty config
  }

  return {};
}

/**
 * Merge configurations with priority: defaults < config file < CLI flags
 */
export async function resolveConfig(
  cliConfig: BunboxConfig = {},
  development: boolean = true
): Promise<ResolvedBunboxConfig> {
  const fileConfig = await loadConfigFile();

  return {
    port: cliConfig.port ?? fileConfig.port ?? defaults.port,
    hostname: cliConfig.hostname ?? fileConfig.hostname ?? defaults.hostname,
    appDir: cliConfig.appDir ?? fileConfig.appDir ?? defaults.appDir,
    wsDir: cliConfig.wsDir ?? fileConfig.wsDir ?? defaults.wsDir,
    socketsDir:
      cliConfig.socketsDir ?? fileConfig.socketsDir ?? defaults.socketsDir,
    publicDir:
      cliConfig.publicDir ?? fileConfig.publicDir ?? defaults.publicDir,
    development,
  };
}
