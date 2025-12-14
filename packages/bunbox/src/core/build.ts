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
import {
  fileExists,
  transpileForBrowser,
  getErrorMessage,
  generateHash,
  loadBunPlugins,
  findCssFile,
} from "./utils";

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
  clientHash: string;
  stylesHash: string;
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
  const bunboxDir = join(process.cwd(), ".bunbox");
  await mkdir(bunboxDir, { recursive: true });

  // Clean up old hashed files before build
  const oldClientFiles = await Array.fromAsync(
    new Bun.Glob("client.*.js").scan(bunboxDir)
  );
  const oldStylesFiles = await Array.fromAsync(
    new Bun.Glob("styles.*.css").scan(bunboxDir)
  );
  for (const file of [...oldClientFiles, ...oldStylesFiles]) {
    await Bun.file(join(bunboxDir, file)).delete().catch(() => {});
  }

  // Generate route files
  console.log(" ○ Generating route files...");
  await generateRoutesFile(config.appDir);
  await generateApiClient(config.appDir, config);
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
    if (buildResult.logs && buildResult.logs.length > 0) {
      buildResult.logs.forEach((log) => console.error(log));
    }
    process.exit(1);
  }

  // Generate content hash and write hashed client bundle
  const clientHash = generateHash(buildResult.output);
  const clientJsPath = join(bunboxDir, `client.${clientHash}.js`);
  await Bun.write(clientJsPath, buildResult.output);

  const bundleSize = new TextEncoder().encode(buildResult.output).length;
  const bundleSizeKB = (bundleSize / 1024).toFixed(2);
  console.log(` ✓ Built client.${clientHash}.js (${bundleSizeKB} KB)`);

  // Build and hash CSS
  console.log(" ○ Building styles...");
  const rootLayoutPath = layouts.has("/")
    ? join(config.appDir, layouts.get("/")!)
    : undefined;
  const cssPath = await findCssFile(config.appDir, rootLayoutPath);
  let stylesHash = "";

  if (cssPath) {
    const plugins = await loadBunPlugins();
    const cssResult = await Bun.build({
      entrypoints: [cssPath],
      minify: true,
      plugins: plugins.length ? plugins : undefined,
    });

    if (cssResult.success && cssResult.outputs[0]) {
      const processedCss = await cssResult.outputs[0].text();
      stylesHash = generateHash(processedCss);
      await Bun.write(join(bunboxDir, `styles.${stylesHash}.css`), processedCss);
      const cssSizeKB = (processedCss.length / 1024).toFixed(2);
      console.log(` ✓ Built styles.${stylesHash}.css (${cssSizeKB} KB)`);
    } else {
      console.warn(" ⚠ CSS build failed, styles will be processed at runtime");
    }
  } else {
    console.log(" ○ No CSS file found, skipping styles");
  }

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
    clientHash,
    stylesHash,
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
  const metadataPath = join(process.cwd(), ".bunbox", ".built");

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
      typeof data.bundleSize !== "number" ||
      typeof data.clientHash !== "string"
    ) {
      console.warn("Invalid build metadata structure");
      return null;
    }

    // Ensure stylesHash exists (default to empty string for backwards compat)
    if (typeof data.stylesHash !== "string") {
      data.stylesHash = "";
    }

    return data as BuildMetadata;
  } catch (error) {
    console.warn(`Failed to read build metadata: ${getErrorMessage(error)}`);
    return null;
  }
}
