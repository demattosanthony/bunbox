/**
 * Core utilities for Bunbox
 * Centralizes common patterns used across the framework
 */

import { join } from "path";
import { createRequire } from "module";
import type { BunPlugin } from "bun";

/**
 * Extract error message from unknown error value
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Dynamically import a module with cache busting in development
 */
export async function dynamicImport<T = any>(
  path: string,
  development: boolean = false
): Promise<T> {
  const absolutePath = path.startsWith("/") ? path : join(process.cwd(), path);

  if (development) {
    // Add timestamp to bypass import cache in development
    return await import(absolutePath + "?t=" + Date.now());
  }

  return await import(absolutePath);
}

/**
 * Resolve a path to an absolute path, handling both relative and absolute inputs
 */
export function resolveAbsolutePath(path: string): string {
  return path.startsWith("/") ? path : join(process.cwd(), path);
}

/**
 * Check if a file exists using Bun.file
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    return await Bun.file(path).exists();
  } catch {
    return false;
  }
}

/**
 * Build Bun.build transpile options consistently
 */
export async function transpileForBrowser(
  entrypoints: string[],
  options: {
    minify?: boolean;
    external?: string[];
  } = {}
): Promise<{ success: boolean; output?: string; logs?: any[] }> {
  const singletonPlugin = getReactSingletonPlugin();
  const transpiled = await Bun.build({
    entrypoints,
    target: "browser",
    format: "esm",
    minify: options.minify ?? false,
    external: options.external ?? [],
    plugins: singletonPlugin ? [singletonPlugin] : undefined,
  });

  if (transpiled.success && transpiled.outputs[0]) {
    return {
      success: true,
      output: await transpiled.outputs[0].text(),
    };
  }

  return {
    success: false,
    logs: transpiled.logs,
  };
}

/**
 * Get content type for favicon based on file extension
 */
const FAVICON_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
};

export function getFaviconContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return FAVICON_TYPES[ext || ""] || "image/x-icon";
}

const requireFromApp = createRequire(join(process.cwd(), "package.json"));
const REACT_SPECIFIERS = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
] as const;

type ReactSpecifier = (typeof REACT_SPECIFIERS)[number];
type ResolutionMap = Map<ReactSpecifier, string>;

let cachedReactPlugin: BunPlugin | null | undefined;
let cachedReactResolutions: ResolutionMap | null = null;

function getReactSingletonPlugin(): BunPlugin | null {
  if (cachedReactPlugin !== undefined) {
    return cachedReactPlugin;
  }

  const resolutions = getReactResolutions();
  if (resolutions.size === 0) {
    cachedReactPlugin = null;
    return null;
  }

  cachedReactPlugin = {
    name: "bunbox-react-singleton",
    target: "browser",
    setup(builder) {
      for (const [specifier, path] of resolutions.entries()) {
        builder.onResolve(
          { filter: new RegExp(`^${escapeRegExp(specifier)}$`) },
          () => ({ path })
        );
      }
    },
  };

  return cachedReactPlugin;
}

function getReactResolutions(): ResolutionMap {
  if (cachedReactResolutions) {
    return cachedReactResolutions;
  }

  const resolutions: ResolutionMap = new Map();
  for (const specifier of REACT_SPECIFIERS) {
    try {
      const path = requireFromApp.resolve(specifier);
      resolutions.set(specifier, path);
    } catch {
      // Ignore unresolved specifiers
    }
  }

  cachedReactResolutions = resolutions;
  return resolutions;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Load Bun plugins from bunfig.toml (cached)
 */
let cachedPlugins: any[] | null = null;

export async function loadBunPlugins(): Promise<any[]> {
  if (cachedPlugins) return cachedPlugins;

  const bunfigPath = join(process.cwd(), "bunfig.toml");
  if (!(await fileExists(bunfigPath))) {
    cachedPlugins = [];
    return [];
  }

  try {
    const content = await Bun.file(bunfigPath).text();
    const match = content.match(/plugins\s*=\s*\[(.*?)\]/);
    if (!match?.[1]) {
      cachedPlugins = [];
      return [];
    }

    const pluginNames = match[1]
      .split(",")
      .map((p) => p.trim().replace(/["']/g, ""))
      .filter(Boolean);

    const results = await Promise.allSettled(
      pluginNames.map((name) => import(name))
    );

    cachedPlugins = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value.default)
      .filter(Boolean);

    return cachedPlugins;
  } catch {
    cachedPlugins = [];
    return [];
  }
}
