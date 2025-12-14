/**
 * Core utilities for Bunbox
 * Centralizes common patterns used across the framework
 */

import { join, resolve } from "path";
import { createRequire } from "module";
import { mkdir, copyFile } from "node:fs/promises";
import { createHash } from "crypto";
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
export async function dynamicImport<T = unknown>(
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
 * Asset file extensions that should be handled by the loader
 */
const ASSET_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "avif",
  "ico",
  "bmp",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
];

/**
 * Generate an 8-character MD5 hash from any input
 * Used for asset filenames and cache busting
 */
export function generateHash(input: string | Uint8Array): string {
  const hash = createHash("md5");
  hash.update(input);
  return hash.digest("hex").slice(0, 8);
}

/**
 * Regex pattern for matching asset file extensions
 */
const assetPattern = new RegExp(`\\.(${ASSET_EXTENSIONS.join("|")})$`, "i");

/**
 * Process an asset file: copy to .bunbox/assets with hashed filename
 * Returns the public URL or undefined if processing fails
 * Includes path traversal protection to prevent accessing files outside project
 */
async function processAssetFile(
  filePath: string
): Promise<{ publicUrl: string; contents: string } | undefined> {
  // Security: Validate path is within project directory
  const cwd = process.cwd();
  const resolvedPath = resolve(filePath);
  if (!resolvedPath.startsWith(cwd + "/") && resolvedPath !== cwd) {
    console.error(`[bunbox] Security: Asset path outside project directory: ${filePath}`);
    return undefined;
  }

  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  if (!ASSET_EXTENSIONS.includes(ext)) return undefined;

  const hash = generateHash(filePath);
  const basename = filePath.split("/").pop()?.replace(/\.[^.]+$/, "") || "asset";
  const filename = `${basename}.${hash}.${ext}`;

  const assetsDir = join(cwd, ".bunbox", "assets");
  await mkdir(assetsDir, { recursive: true });

  const destPath = join(assetsDir, filename);
  try {
    await copyFile(resolvedPath, destPath);
  } catch (error) {
    console.error(`Failed to copy asset ${filePath}:`, error);
    return undefined;
  }

  const publicUrl = `/__bunbox/assets/${filename}`;
  return { publicUrl, contents: `export default "${publicUrl}";` };
}

/**
 * Create a plugin to handle asset imports (images, fonts, etc.)
 * Used for Bun.build() (client bundling)
 */
function createAssetLoaderPlugin(): BunPlugin {
  return {
    name: "bunbox-asset-loader",
    setup(build) {
      build.onLoad({ filter: assetPattern }, async (args) => {
        const result = await processAssetFile(args.path);
        return result ? { contents: result.contents, loader: "js" } : undefined;
      });
    },
  };
}

/**
 * Track whether runtime asset plugin has been registered
 */
let assetPluginRegistered = false;

/**
 * Register the asset loader plugin at runtime for server-side imports
 * This ensures SSR renders the same asset URLs as the client bundle
 * Must be called before any page/layout modules are imported
 */
export function registerAssetPlugin(): void {
  if (assetPluginRegistered) return;
  assetPluginRegistered = true;

  Bun.plugin({
    name: "bunbox-asset-loader-runtime",
    setup(build) {
      build.onLoad({ filter: assetPattern }, async (args) => {
        const result = await processAssetFile(args.path);
        return result ? { contents: result.contents, loader: "js" } : undefined;
      });
    },
  });
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
): Promise<{ success: boolean; output?: string; logs?: unknown[] }> {
  const singletonPlugin = getReactSingletonPlugin();
  const assetLoaderPlugin = createAssetLoaderPlugin();

  const plugins = [assetLoaderPlugin];
  if (singletonPlugin) {
    plugins.push(singletonPlugin);
  }

  const transpiled = await Bun.build({
    entrypoints,
    target: "browser",
    format: "esm",
    minify: options.minify ?? false,
    external: options.external ?? [],
    plugins,
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

/**
 * Resolve a URL to an absolute URL using a metadata base
 * - If url is already absolute (http:// or https://), return as-is
 * - If url is a path, prepend metadataBase
 * - If metadataBase is not set, return undefined (can't resolve)
 */
export function resolveMetadataUrl(
  url: string | undefined,
  metadataBase: string | undefined
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!metadataBase) return undefined;
  const base = metadataBase.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
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
let cachedPlugins: BunPlugin[] | null = null;

export async function loadBunPlugins(): Promise<BunPlugin[]> {
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
      .filter(
        (r): r is PromiseFulfilledResult<{ default: BunPlugin }> =>
          r.status === "fulfilled" && Boolean(r.value?.default)
      )
      .map((r) => r.value.default);

    return cachedPlugins;
  } catch {
    cachedPlugins = [];
    return [];
  }
}

/**
 * Find CSS file in app directory by parsing layout imports
 * First checks for CSS imports in the root layout file, then falls back to common names
 * Returns null if no CSS file is found
 */
export async function findCssFile(
  appDir: string,
  rootLayoutPath?: string
): Promise<string | null> {
  // If root layout path provided, try to parse CSS imports from it
  if (rootLayoutPath && (await fileExists(rootLayoutPath))) {
    try {
      const layoutContent = await Bun.file(rootLayoutPath).text();

      // Match CSS imports: import "./styles.css" or import './index.css' or import("./app.css")
      const cssImportRegex = /import\s+(?:["']|(?:\(["']))(\.\/[^"']+\.css)["']/g;
      const matches = layoutContent.matchAll(cssImportRegex);

      for (const match of matches) {
        if (match[1]) {
          // Remove leading "./" and join with appDir
          const cssFileName = match[1].replace(/^\.\//, "");
          const cssPath = join(appDir, cssFileName);
          if (await fileExists(cssPath)) {
            return cssPath;
          }
        }
      }
    } catch (error) {
      // If parsing fails, fall through to common names check
    }
  }

  // Fallback: check common CSS file names in priority order
  const commonNames = ["index.css", "styles.css", "global.css", "app.css"];

  for (const name of commonNames) {
    const cssPath = join(appDir, name);
    if (await fileExists(cssPath)) {
      return cssPath;
    }
  }

  return null;
}
