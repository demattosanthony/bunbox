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
    console.error(
      `[bunbox] Security: Asset path outside project directory: ${filePath}`
    );
    return undefined;
  }

  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  if (!ASSET_EXTENSIONS.includes(ext)) return undefined;

  const hash = generateHash(filePath);
  const basename =
    filePath
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") || "asset";
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
    // Use Bun target so build-time helpers (e.g. createRequire) work without
    // triggering "Browser build cannot import Node.js builtin" errors.
    // The generated bundle remains ESM and browser-ready, but the build
    // process can safely use Node/Bun utilities.
    target: "bun",
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
 * Extract CSS imports from a file's content
 * Matches:
 * - Relative: import "./styles.css", import '../parent.css'
 * - Package: import "@xterm/xterm/css/xterm.css", import "some-package/styles.css"
 */
function extractCssImports(
  content: string
): { path: string; isPackage: boolean }[] {
  // Match any import statement or string literal containing a .css file
  // This catches: import "x.css", import("x.css"), from "x.css", require("x.css")
  const cssImportRegex = /["']([^"']+\.css)["']/g;
  const imports: { path: string; isPackage: boolean }[] = [];
  let match;

  while ((match = cssImportRegex.exec(content)) !== null) {
    if (match[1]) {
      const importPath = match[1];
      // Check if it's a relative path or a package path
      const isRelative =
        importPath.startsWith("./") || importPath.startsWith("../");
      imports.push({
        path: importPath,
        isPackage: !isRelative,
      });
    }
  }

  return imports;
}

/**
 * Extract JS/TS imports from a file's content for recursive scanning
 * Matches relative imports and @/ alias imports (not node_modules packages)
 */
function extractJsImports(
  content: string
): { path: string; isAlias: boolean }[] {
  // Match imports: import X from "./file", import "./file", export X from "./file"
  // Also match @/ alias imports
  const importRegex =
    /(?:import|export)\s+(?:[\w{},*\s]+\s+from\s+)?["']([^"']+)["']/g;
  const imports: { path: string; isAlias: boolean }[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) {
      const importPath = match[1];

      // Skip node_modules packages (don't start with . or @/)
      // But include @/ alias imports
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        imports.push({ path: importPath, isAlias: false });
      } else if (importPath.startsWith("@/")) {
        imports.push({ path: importPath, isAlias: true });
      }
      // Skip other imports (node_modules packages like "react", "@radix-ui/xxx", etc.)
    }
  }

  return imports;
}

/**
 * Resolve a file path, trying common extensions if needed
 */
async function resolveFilePath(basePath: string): Promise<string | null> {
  // If it already has an extension and exists, use it
  if (await fileExists(basePath)) {
    return basePath;
  }

  // Try common extensions
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  for (const ext of extensions) {
    const pathWithExt = basePath + ext;
    if (await fileExists(pathWithExt)) {
      return pathWithExt;
    }
  }

  // Try index files
  for (const ext of extensions) {
    const indexPath = join(basePath, `index${ext}`);
    if (await fileExists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Find node_modules directories by walking up from cwd
 * Returns array of paths to check, in order of priority
 */
function findNodeModulesPaths(): string[] {
  const paths: string[] = [];
  let dir = process.cwd();
  const root = join(dir, "..");

  while (dir !== root) {
    paths.push(join(dir, "node_modules"));
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return paths;
}

/**
 * Resolve a package CSS import to an absolute path
 * Handles packages with exports field that don't explicitly export CSS
 */
async function resolvePackageCss(packagePath: string): Promise<string | null> {
  // First, try require.resolve (works for packages that export their CSS)
  try {
    const requireFromCwd = createRequire(join(process.cwd(), "package.json"));
    const resolved = requireFromCwd.resolve(packagePath);
    if (await fileExists(resolved)) {
      return resolved;
    }
  } catch {
    // require.resolve failed, try manual resolution
  }

  // Manual resolution: look in node_modules directories
  // This handles packages that use exports field without explicit CSS exports
  const nodeModulesPaths = findNodeModulesPaths();

  for (const nodeModulesPath of nodeModulesPaths) {
    // Handle scoped packages (@org/package) and regular packages
    const fullPath = join(nodeModulesPath, packagePath);

    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Resolve @/ alias path by trying common base directories
 * Most projects configure @/ to map to project root or src/
 */
async function resolveAliasPath(aliasPath: string): Promise<string | null> {
  const cwd = process.cwd();

  // Common locations for @/ alias in order of priority:
  // 1. Project root (most common: @/ -> ./)
  // 2. src directory (@/ -> ./src/)
  // 3. app directory (@/ -> ./app/)
  const baseDirs = [cwd, join(cwd, "src"), join(cwd, "app")];

  for (const baseDir of baseDirs) {
    const resolved = await resolveFilePath(join(baseDir, aliasPath));
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

/**
 * Find all CSS files imported across the app
 * Recursively scans provided files and their imports for CSS
 * Handles both relative and package (node_modules) CSS imports
 *
 * @param filesToScan - Initial files to scan (layouts/pages)
 * @param appDir - The app directory (used for context, not alias resolution)
 */
export async function findAllCssFiles(
  filesToScan: string[],
  _appDir?: string
): Promise<string[]> {
  const cssFiles = new Set<string>();
  const scannedFiles = new Set<string>();
  const filesToProcess = [...filesToScan];

  while (filesToProcess.length > 0) {
    const filePath = filesToProcess.pop()!;

    // Skip if already scanned
    if (scannedFiles.has(filePath)) continue;
    scannedFiles.add(filePath);

    if (!(await fileExists(filePath))) continue;

    try {
      const content = await Bun.file(filePath).text();
      const fileDir = join(filePath, "..");

      // Extract CSS imports
      const cssImports = extractCssImports(content);
      for (const cssImport of cssImports) {
        let absoluteCssPath: string | null = null;

        if (cssImport.isPackage) {
          // Resolve package import (e.g., @xterm/xterm/css/xterm.css)
          absoluteCssPath = await resolvePackageCss(cssImport.path);
        } else {
          // Resolve relative import
          absoluteCssPath = resolve(fileDir, cssImport.path);
          if (!(await fileExists(absoluteCssPath))) {
            absoluteCssPath = null;
          }
        }

        if (absoluteCssPath) {
          cssFiles.add(absoluteCssPath);
        }
      }

      // Extract JS/TS imports and add them to the scan queue
      const jsImports = extractJsImports(content);
      for (const jsImport of jsImports) {
        let resolvedPath: string | null = null;

        if (jsImport.isAlias) {
          // Resolve @/ alias - try project root, src/, and app/ directories
          const aliasPath = jsImport.path.replace(/^@\//, "");
          resolvedPath = await resolveAliasPath(aliasPath);
        } else {
          // Resolve relative import
          resolvedPath = await resolveFilePath(resolve(fileDir, jsImport.path));
        }

        if (resolvedPath && !scannedFiles.has(resolvedPath)) {
          filesToProcess.push(resolvedPath);
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return Array.from(cssFiles);
}
