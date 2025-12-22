/**
 * Configuration management for Bunbox
 */

import { join } from "path";

/**
 * CORS configuration options
 */
export interface CorsConfig {
  /** Allowed origins. Use '*' for any, array for specific, or function for dynamic */
  origin?: string | string[] | ((origin: string) => boolean);
  /** Allowed HTTP methods (default: GET, POST, PUT, DELETE, PATCH, OPTIONS) */
  methods?: string[];
  /** Allowed request headers (default: Content-Type, Authorization) */
  allowedHeaders?: string[];
  /** Headers exposed to the client */
  exposedHeaders?: string[];
  /** Allow credentials (cookies, authorization headers) */
  credentials?: boolean;
  /** Preflight cache duration in seconds (default: 86400) */
  maxAge?: number;
}

/**
 * OpenAPI configuration options
 */
export interface OpenAPIConfig {
  /** Whether OpenAPI is enabled */
  enabled?: boolean;
  /** Base path for docs endpoints (default: '/api/docs') */
  path?: string;
  /** API title */
  title?: string;
  /** API version */
  version?: string;
  /** API description */
  description?: string;
  /** Server URLs */
  servers?: Array<{ url: string; description?: string }>;
}

export interface BunboxConfig {
  port?: number;
  hostname?: string;
  appDir?: string;
  wsDir?: string;
  publicDir?: string;
  /** Maximum request body size in bytes (default: 1MB = 1048576) */
  maxBodySize?: number;
  /** CORS configuration. Set to true for permissive defaults, or configure specific options */
  cors?: CorsConfig | boolean;
  /** OpenAPI/Swagger documentation configuration */
  openapi?: OpenAPIConfig;
}

/**
 * Resolved CORS configuration with defaults applied
 */
export interface ResolvedCorsConfig {
  origin: string | string[] | ((origin: string) => boolean);
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface ResolvedBunboxConfig {
  port: number;
  hostname: string;
  appDir: string;
  wsDir: string;
  publicDir: string;
  maxBodySize: number;
  development: boolean;
  cors: ResolvedCorsConfig | null;
  openapi: OpenAPIConfig | null;
}

/**
 * Default CORS configuration (used when cors: true)
 */
const defaultCors: ResolvedCorsConfig = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: [],
  credentials: false,
  maxAge: 86400,
};

/**
 * Resolve CORS config from user input
 */
function resolveCorsConfig(
  cors: CorsConfig | boolean | undefined
): ResolvedCorsConfig | null {
  if (!cors) return null;
  if (cors === true) return defaultCors;
  return {
    origin: cors.origin ?? defaultCors.origin,
    methods: cors.methods ?? defaultCors.methods,
    allowedHeaders: cors.allowedHeaders ?? defaultCors.allowedHeaders,
    exposedHeaders: cors.exposedHeaders ?? defaultCors.exposedHeaders,
    credentials: cors.credentials ?? defaultCors.credentials,
    maxAge: cors.maxAge ?? defaultCors.maxAge,
  };
}

/**
 * Default configuration
 */
const defaults: Omit<ResolvedBunboxConfig, "cors" | "openapi"> = {
  port: 3000,
  hostname: "localhost",
  appDir: join(process.cwd(), "app"),
  wsDir: join(process.cwd(), "app", "ws"),
  publicDir: join(process.cwd(), "public"),
  maxBodySize: 1024 * 1024, // 1MB
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
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;

  const openapi = cliConfig.openapi ?? fileConfig.openapi ?? null;

  return {
    // Priority: CLI > env var (for deployment) > config file > defaults
    port: cliConfig.port ?? envPort ?? fileConfig.port ?? defaults.port,
    hostname: cliConfig.hostname ?? fileConfig.hostname ?? defaults.hostname,
    appDir: cliConfig.appDir ?? fileConfig.appDir ?? defaults.appDir,
    wsDir: cliConfig.wsDir ?? fileConfig.wsDir ?? defaults.wsDir,
    publicDir:
      cliConfig.publicDir ?? fileConfig.publicDir ?? defaults.publicDir,
    maxBodySize:
      cliConfig.maxBodySize ?? fileConfig.maxBodySize ?? defaults.maxBodySize,
    development,
    cors: resolveCorsConfig(cliConfig.cors ?? fileConfig.cors),
    openapi: openapi?.enabled ? openapi : null,
  };
}
