/**
 * Core utilities for Bunbox
 * Centralizes common patterns used across the framework
 */

import { join } from "path";

/**
 * Get the .bunbox directory path
 */
export function getBunboxDir(): string {
  return join(process.cwd(), ".bunbox");
}

/**
 * Resolve a path to an absolute path, handling both relative and absolute inputs
 */
export function resolveAbsolutePath(path: string): string {
  return path.startsWith("/") ? path : join(process.cwd(), path);
}

/**
 * Dynamically import a module with cache busting in development
 */
export async function dynamicImport<T = any>(
  path: string,
  development: boolean = false
): Promise<T> {
  const absolutePath = resolveAbsolutePath(path);

  if (development) {
    // Add timestamp to bypass import cache in development
    return await import(absolutePath + "?t=" + Date.now());
  }

  return await import(absolutePath);
}

/**
 * Check if a file exists using Bun.file
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const file = Bun.file(path);
    return await file.exists();
  } catch {
    return false;
  }
}

/**
 * Safe file read with error handling
 */
export async function readFile(path: string): Promise<string | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    return await file.text();
  } catch (error) {
    console.error(`Failed to read file: ${path}`, error);
    return null;
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
  const transpiled = await Bun.build({
    entrypoints,
    target: "browser",
    format: "esm",
    minify: options.minify ?? false,
    external: options.external ?? [],
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
