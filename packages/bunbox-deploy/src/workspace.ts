/**
 * Monorepo/workspace detection and dependency resolution
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join, relative, resolve } from "path";

export interface WorkspaceInfo {
  /** Path to monorepo root (contains workspaces field) */
  root: string;
  /** Relative path from root to the app being deployed */
  appPath: string;
  /** All workspace packages that the app depends on (relative paths from root) */
  requiredPackages: string[];
}

interface PackageJson {
  name?: string;
  workspaces?: string[] | { packages: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Detect if current directory is inside a monorepo workspace
 * Returns null if not in a monorepo
 */
export function detectWorkspace(cwd: string = process.cwd()): WorkspaceInfo | null {
  const root = findWorkspaceRoot(cwd);
  if (!root) return null;

  // We're in a monorepo - calculate the app path
  const appPath = relative(root, cwd);

  // If appPath is empty, we're at the root - not deploying a workspace package
  if (!appPath) return null;

  // Find all required workspace packages
  const requiredPackages = resolveWorkspaceDependencies(root, cwd);

  return {
    root,
    appPath,
    requiredPackages,
  };
}

/**
 * Walk up directory tree to find monorepo root (package.json with workspaces)
 */
function findWorkspaceRoot(startDir: string): string | null {
  let current = resolve(startDir);
  const root = resolve("/");

  while (current !== root) {
    const pkgPath = join(current, "package.json");

    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;

        // Check for workspaces field (both array and object formats)
        if (pkg.workspaces) {
          return current;
        }
      } catch {
        // Invalid JSON, continue searching
      }
    }

    // Also check for bun.lock as indicator we might be in monorepo root
    // but only if we already found a package.json with workspaces above

    current = dirname(current);
  }

  return null;
}

/**
 * Get workspace patterns from package.json
 */
function getWorkspacePatterns(root: string): string[] {
  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;

  if (!pkg.workspaces) return [];

  // Handle both formats: string[] or { packages: string[] }
  if (Array.isArray(pkg.workspaces)) {
    return pkg.workspaces;
  }

  return pkg.workspaces.packages || [];
}

/**
 * Build a map of package name -> directory path for all workspace packages
 */
function buildWorkspacePackageMap(root: string): Map<string, string> {
  const patterns = getWorkspacePatterns(root);
  const packageMap = new Map<string, string>();

  for (const pattern of patterns) {
    // Handle glob patterns like "packages/*" or "apps/*"
    const baseDir = pattern.replace(/\/\*$/, "").replace(/\*$/, "");
    const searchDir = join(root, baseDir);

    if (!existsSync(searchDir)) continue;

    // If pattern ends with *, scan directory for packages
    if (pattern.endsWith("*")) {
      try {
        const entries = Bun.spawnSync(["ls", "-1", searchDir]).stdout.toString().trim().split("\n");

        for (const entry of entries) {
          if (!entry) continue;
          const pkgDir = join(searchDir, entry);
          const pkgJsonPath = join(pkgDir, "package.json");

          if (existsSync(pkgJsonPath)) {
            try {
              const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PackageJson;
              if (pkg.name) {
                packageMap.set(pkg.name, relative(root, pkgDir));
              }
            } catch {
              // Skip invalid package.json
            }
          }
        }
      } catch {
        // Skip if can't list directory
      }
    } else {
      // Exact path pattern
      const pkgJsonPath = join(root, pattern, "package.json");
      if (existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PackageJson;
          if (pkg.name) {
            packageMap.set(pkg.name, pattern);
          }
        } catch {
          // Skip invalid package.json
        }
      }
    }
  }

  return packageMap;
}

/**
 * Resolve all workspace dependencies for an app (recursive)
 */
function resolveWorkspaceDependencies(root: string, appDir: string): string[] {
  const packageMap = buildWorkspacePackageMap(root);
  const required = new Set<string>();
  const visited = new Set<string>();

  function collectDeps(dir: string) {
    if (visited.has(dir)) return;
    visited.add(dir);

    const pkgJsonPath = join(dir, "package.json");
    if (!existsSync(pkgJsonPath)) return;

    let pkg: PackageJson;
    try {
      pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    } catch {
      return;
    }

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      // Check if it's a workspace dependency
      if (version.startsWith("workspace:") || version === "*") {
        const packagePath = packageMap.get(name);
        if (packagePath) {
          required.add(packagePath);
          // Recursively collect dependencies of this package
          collectDeps(join(root, packagePath));
        }
      }
    }
  }

  collectDeps(appDir);
  return Array.from(required);
}
