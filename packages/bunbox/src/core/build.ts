/**
 * Build system for Bunbox
 * Pre-generates all production artifacts for instant startup
 */

import { join } from "path";
import { mkdir } from "node:fs/promises";
import type { ResolvedBunboxConfig } from "./config";
import {
  scanPageRoutes,
  scanApiRoutes,
  scanSocketRoutes,
  scanLayouts,
  scanWorker,
} from "./scanner";
import { generateRoutesFile, generateApiClient } from "./generator";
import { fileExists, transpileForBrowser, getBunboxDir } from "./utils";

/**
 * Build metadata stored in .bunbox/.built
 */
export interface BuildMetadata {
  timestamp: number;
  version: string;
  routes: {
    pages: number;
    apis: number;
    sockets: number;
    layouts: number;
  };
  bundleSize: number;
}

/**
 * Build all production artifacts
 */
export async function buildForProduction(
  config: ResolvedBunboxConfig
): Promise<void> {
  const startTime = Date.now();

  console.log("");
  console.log("   📦 Bunbox Build");
  console.log("");
  console.log(" ○ Scanning routes...");

  // Scan all routes and layouts
  const [pageRoutes, apiRoutes, socketRoutes, layouts, workerPath] =
    await Promise.all([
      scanPageRoutes(config.appDir),
      scanApiRoutes(config.appDir),
      scanSocketRoutes(config.socketsDir),
      scanLayouts(config.appDir),
      scanWorker(config.appDir),
    ]);

  const totalRoutes =
    pageRoutes.length + apiRoutes.length + socketRoutes.length;

  console.log(
    ` ✓ Found ${totalRoutes} routes (${pageRoutes.length} pages, ${apiRoutes.length} APIs, ${socketRoutes.length} sockets)`
  );

  // Create .bunbox directory
  const bunboxDir = getBunboxDir();
  await mkdir(bunboxDir, { recursive: true });

  // Generate route files
  console.log(" ○ Generating route files...");
  await generateRoutesFile(config.appDir);
  await generateApiClient(config.appDir);
  console.log(" ✓ Generated routes.ts and api-client.ts");

  // Build client bundle
  console.log(" ○ Building client bundle...");
  const entryPath = join(bunboxDir, "entry.ts");

  if (!(await fileExists(entryPath))) {
    console.error(
      " ✗ Error: entry.ts not found. Route generation may have failed."
    );
    process.exit(1);
  }

  const buildResult = await transpileForBrowser([entryPath], {
    minify: true,
    external: [],
  });

  if (!buildResult.success || !buildResult.output) {
    console.error(" ✗ Failed to build client bundle");
    if (buildResult.logs) {
      console.error(buildResult.logs);
    }
    process.exit(1);
  }

  // Write bundled client.js
  const clientJsPath = join(bunboxDir, "client.js");
  await Bun.write(clientJsPath, buildResult.output);

  const bundleSize = new TextEncoder().encode(buildResult.output).length;
  const bundleSizeKB = (bundleSize / 1024).toFixed(2);
  console.log(` ✓ Built client.js (${bundleSizeKB} KB)`);

  // Write build metadata
  const metadata: BuildMetadata = {
    timestamp: Date.now(),
    version: "0.2.0", // Could read from package.json
    routes: {
      pages: pageRoutes.length,
      apis: apiRoutes.length,
      sockets: socketRoutes.length,
      layouts: layouts.size,
    },
    bundleSize,
  };

  const metadataPath = join(bunboxDir, ".built");
  await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));

  const duration = Date.now() - startTime;
  console.log("");
  console.log(` ✓ Build completed in ${duration}ms`);
  console.log("");
  console.log("   Ready for production! Run 'bunbox start' to serve.");
  console.log("");
}

/**
 * Check if build artifacts exist and are valid
 */
export async function hasBuildArtifacts(): Promise<boolean> {
  // Simply check if valid build metadata exists
  // If metadata is valid, we can trust all artifacts exist
  const metadata = await getBuildMetadata();
  return metadata !== null;
}

/**
 * Read and validate build metadata
 */
export async function getBuildMetadata(): Promise<BuildMetadata | null> {
  const metadataPath = join(getBunboxDir(), ".built");

  if (!(await fileExists(metadataPath))) {
    return null;
  }

  try {
    const file = Bun.file(metadataPath);
    const content = await file.text();
    const data = JSON.parse(content);

    // Validate structure
    if (
      !data ||
      typeof data.timestamp !== "number" ||
      typeof data.version !== "string" ||
      !data.routes ||
      typeof data.bundleSize !== "number"
    ) {
      console.warn("Invalid build metadata structure");
      return null;
    }

    return data as BuildMetadata;
  } catch (error) {
    console.warn("Failed to read build metadata:", error);
    return null;
  }
}
