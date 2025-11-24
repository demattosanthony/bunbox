/**
 * Route generator for Bunbox
 * Generates routes.ts and api-client.ts files
 */

import { join } from "path";
import { mkdir } from "node:fs/promises";
import { scanPageRoutes, scanLayouts, scanApiRoutes } from "./scanner";
import { routePathToUrl, toBunRoutePath } from "./router";
import { checkUseServer, checkUseClient } from "./ssr";
import { dynamicImport, resolveAbsolutePath } from "./utils";
import {
  buildApiObject,
  generateTypeAliases,
  HTTP_METHODS,
} from "./generator/type-helpers";
import type {
  ApiRouteTreeNode,
  ApiRouteMethodMeta,
} from "./generator/type-helpers";
import type { ApiRouteModule } from "./types";
import type { ResolvedBunboxConfig } from "./config";

function createRouteTreeNode(): ApiRouteTreeNode {
  return {
    children: new Map(),
    methods: [],
  };
}

function insertRouteMethod(
  node: ApiRouteTreeNode,
  segments: string[],
  meta: ApiRouteMethodMeta
): void {
  let current = node;

  for (const segment of segments) {
    if (!current.children.has(segment)) {
      current.children.set(segment, createRouteTreeNode());
    }
    current = current.children.get(segment)!;
  }

  current.methods.push(meta);
}

/**
 * Validate component tree hierarchy
 * Server components cannot be children of client components
 */
async function validateComponentTree(
  appDir: string,
  pageEntries: Array<{
    routePath: string;
    filepath: string;
    requiresSSR: boolean;
  }>,
  layoutEntries: Array<{
    routePath: string;
    layoutFile: string;
    isServerLayout: boolean;
  }>
): Promise<void> {
  const warnings: string[] = [];

  // Build a map of paths to their directive status
  const pathDirectives = new Map<string, "server" | "client" | "none">();

  // Check layouts first (they're higher in the tree)
  for (const layout of layoutEntries) {
    const hasClient = await checkUseClient(join(appDir, layout.layoutFile));
    if (layout.isServerLayout) {
      pathDirectives.set(layout.routePath, "server");
    } else if (hasClient) {
      pathDirectives.set(layout.routePath, "client");
    } else {
      pathDirectives.set(layout.routePath, "none");
    }
  }

  // Check pages
  for (const page of pageEntries) {
    const hasClient = await checkUseClient(join(appDir, page.filepath));
    let pageDirective: "server" | "client" | "none" = "none";

    if (page.requiresSSR) {
      pageDirective = "server";
    } else if (hasClient) {
      pageDirective = "client";
    }

    // Check if any parent layout is a client component
    // If so, this page cannot be a server component
    const pathSegments = page.routePath.split("/").filter(Boolean);
    let currentPath = "";
    let hasClientAncestor = false;

    // Check root layout
    if (pathDirectives.get("/") === "client") {
      hasClientAncestor = true;
    }

    // Check nested layouts
    for (const segment of pathSegments) {
      currentPath += "/" + segment;
      if (pathDirectives.get(currentPath) === "client") {
        hasClientAncestor = true;
        break;
      }
    }

    // Validate: Server component cannot be child of client component
    if (hasClientAncestor && pageDirective === "server") {
      warnings.push(
        `⚠️  Invalid component tree: Page "${page.routePath}" has "use server" but is nested under a client component layout. Server components cannot be children of client components.`
      );
    }

    // Also check if a client layout is nested under a server layout with a server page
    // This creates an invalid tree: Server -> Client -> Server
    if (pageDirective === "server") {
      let foundClient = false;
      let foundServerBeforeClient = false;
      currentPath = "";

      // Check root
      if (pathDirectives.get("/") === "server") {
        foundServerBeforeClient = true;
      }

      for (const segment of pathSegments) {
        currentPath += "/" + segment;
        const directive = pathDirectives.get(currentPath);

        if (directive === "client") {
          foundClient = true;
        } else if (directive === "server" && !foundClient) {
          foundServerBeforeClient = true;
        }
      }

      if (foundServerBeforeClient && foundClient) {
        warnings.push(
          `⚠️  Invalid component tree: Page "${page.routePath}" creates a Server -> Client -> Server pattern, which is not allowed. Once you have a client component, all children must be client components.`
        );
      }
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log("");
    console.log("⚠️  Component Tree Validation Warnings:");
    warnings.forEach((warning) => console.log(warning));
    console.log("");
    console.log("Learn more: https://react.dev/reference/rsc/use-client");
    console.log("");
  }
}

/**
 * Generate routes file for client-side hydration
 */
export async function generateRoutesFile(appDir: string): Promise<string> {
  const pageRoutes = (await scanPageRoutes(appDir)).sort((a, b) =>
    a.filepath.localeCompare(b.filepath)
  );
  const layouts = await scanLayouts(appDir);

  const imports: string[] = [];
  const routeExports: string[] = [];
  const layoutExports: string[] = [];
  const ssrPages: string[] = [];

  const pageEntries = await Promise.all(
    pageRoutes.map(async (route, index) => {
      const routePath = routePathToUrl(route.filepath);
      const importName = `Page${index}`;
      const requiresSSR = await checkUseServer(join(appDir, route.filepath));

      return {
        importName,
        routePath,
        filepath: route.filepath,
        requiresSSR,
      };
    })
  );

  for (const entry of pageEntries) {
    // Only import non-SSR pages into client bundle
    // SSR pages are rendered on the server and don't need client-side routing
    if (!entry.requiresSSR) {
      imports.push(
        `import ${entry.importName} from "../app/${entry.filepath}";`
      );
      routeExports.push(`  "${entry.routePath}": ${entry.importName}`);
    } else {
      // Keep track of SSR pages for the router to handle differently
      ssrPages.push(`  "${entry.routePath}"`);
    }
  }

  const sortedLayouts = Array.from(layouts.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Check which layouts can be included in client bundle
  const layoutEntries = await Promise.all(
    sortedLayouts.map(async ([routePath, layoutFile]) => {
      const isServerLayout = await checkUseServer(join(appDir, layoutFile));
      return {
        routePath,
        layoutFile,
        isServerLayout,
      };
    })
  );

  let layoutCounter = pageEntries.length;
  for (const entry of layoutEntries) {
    const importName = `Layout${layoutCounter++}`;

    // Only import non-server layouts into client bundle
    // Server layouts are rendered on the server during SSR
    if (!entry.isServerLayout) {
      imports.push(`import ${importName} from "../app/${entry.layoutFile}";`);
      layoutExports.push(`  "${entry.routePath}": ${importName}`);
    }
  }

  // Validate component tree hierarchy
  await validateComponentTree(appDir, pageEntries, layoutEntries);

  // Write routes file
  const bunboxDir = join(process.cwd(), ".bunbox");
  await mkdir(bunboxDir, { recursive: true });

  const routesContent = `/**
 * Auto-generated routes file for Bunbox
 * Do not edit this file manually
 */

${imports.join("\n")}

export const routes = {
${routeExports.join(",\n")}
};

export const layouts = {
${layoutExports.join(",\n")}
};

// Set of route paths that require server-side rendering
export const ssrPages = new Set([
${ssrPages.join(",\n")}
]);
`;

  await Bun.write(join(bunboxDir, "routes.ts"), routesContent);

  // Create entry point
  const hydratePath = join(import.meta.dir, "..", "client", "hydrate.tsx");
  const entryContent = `/**
 * Auto-generated entry point for Bunbox client
 * Do not edit this file manually
 */

import { initBunbox } from "${hydratePath}";
import { routes, layouts, ssrPages } from "./routes";

// Initialize the app
initBunbox(routes, layouts, ssrPages).catch((error) => {
  console.error("Failed to initialize Bunbox app:", error);
});
`;

  const entryPath = join(bunboxDir, "entry.ts");
  await Bun.write(entryPath, entryContent);

  return entryPath;
}

/**
 * Generate typed API client for all API routes
 */
export async function generateApiClient(
  appDir: string,
  config?: ResolvedBunboxConfig
): Promise<void> {
  const apiRoutes = (await scanApiRoutes(appDir)).sort((a, b) =>
    a.filepath.localeCompare(b.filepath)
  );
  const bunboxDir = join(process.cwd(), ".bunbox");
  await mkdir(bunboxDir, { recursive: true });

  // Scan routes and build client structure
  const routeTree = createRouteTreeNode();
  const typeImports: string[] = [];
  let importCounter = 0;

  for (const route of apiRoutes) {
    try {
      const absolutePath = resolveAbsolutePath(join(appDir, route.filepath));
      const module = await dynamicImport<ApiRouteModule>(absolutePath, false);
      const availableMethods = HTTP_METHODS.filter((method) => module[method]);

      if (availableMethods.length === 0) continue;

      // Get clean paths
      const routePath = toBunRoutePath(route);
      const clientPath = routePath.replace(/^\/api\/?/, "") || "/";
      const urlPath = routePath.replace(/:([^/]+)/g, "[$1]");
      const segments =
        clientPath === "/" ? [] : clientPath.split("/").filter(Boolean);

      const importName = `Route${importCounter++}`;
      typeImports.push(
        `import type * as ${importName} from "../app/${route.filepath}";`
      );

      for (const method of availableMethods) {
        insertRouteMethod(routeTree, segments, {
          path: urlPath,
          importName,
          method,
          typeAlias: `${importName}_${method}`,
        });
      }
    } catch (error) {
      console.warn(`Could not analyze API route: ${route.filepath}`);
    }
  }

  // Generate client code
  const clientCode = generateClientCode(routeTree, typeImports, config);
  await Bun.write(join(bunboxDir, "api-client.ts"), clientCode);
}

/**
 * Generate the actual client code from route tree
 */
function generateClientCode(
  routeTree: ApiRouteTreeNode,
  typeImports: string[],
  config?: ResolvedBunboxConfig
): string {
  const lines: string[] = [
    "/**",
    " * Auto-generated typed API client for Bunbox",
    " * Do not edit this file manually",
    " */",
    "",
  ];

  // Add type imports
  if (typeImports.length > 0) {
    lines.push(...typeImports, "");
  }

  // Generate type aliases
  const typeAliases = generateTypeAliases(routeTree);
  if (typeAliases.length > 0) {
    lines.push("// Response types extracted from handlers", ...typeAliases, "");
  }

  // Import React hooks
  const useQueryPath = join(import.meta.dir, "..", "client", "useQuery");
  const useStreamPath = join(import.meta.dir, "..", "client", "useStream");
  lines.push(
    `import { createQueryHook } from "${useQueryPath}";`,
    `import type { UseQueryOptions, UseQueryResult } from "${useQueryPath}";`,
    `import { useStream as useStreamHook } from "${useStreamPath}";`,
    `import type { UseStreamOptions, UseStreamResult } from "${useStreamPath}";`,
    ""
  );

  // Add stream parser helper
  lines.push(
    "async function* parseResponseStream(res: Response, transform: (chunk: string) => any): AsyncGenerator<any> {",
    "  const reader = res.body?.getReader();",
    "  if (!reader) return;",
    "  const decoder = new TextDecoder();",
    "  while (true) {",
    "    const { done, value } = await reader.read();",
    "    if (done) break;",
    "    const chunk = decoder.decode(value, { stream: true });",
    "    yield* transform(chunk);",
    "  }",
    "}",
    "",
    "function* parseSSEChunk(chunk: string): Generator<any> {",
    '  const lines = chunk.split("\\n\\n");',
    "  for (const line of lines) {",
    '    if (line.startsWith("data: ")) {',
    "      try { yield JSON.parse(line.slice(6)); } catch {}",
    "    }",
    "  }",
    "}",
    "",
    "async function* parseSSE(res: Response): AsyncGenerator<any> {",
    "  return yield* parseResponseStream(res, parseSSEChunk);",
    "}",
    "",
    "async function* parseStream(res: Response): AsyncGenerator<any> {",
    "  return yield* parseResponseStream(res, function* (chunk) { yield chunk; });",
    "}",
    ""
  );

  // ClientResponse mapping type
  lines.push(
    "type ClientResponse<T> = T extends { __brand: 'streaming', __type: infer U }",
    "  ? AsyncIterable<U>",
    "  : T extends { __brand: 'sse', __type: infer U }",
    "  ? AsyncIterable<U>",
    "  : T;",
    ""
  );

  // Add request function
  lines.push(
    "async function request<TResponse, TParams = Record<string, unknown>, TQuery = Record<string, unknown>, TBody = unknown>(",
    "  method: string,",
    "  path: string,",
    "  opts?: { params?: TParams; query?: TQuery; body?: TBody; headers?: HeadersInit }",
    "): Promise<ClientResponse<TResponse>> {",
    "  let url = path;",
    "  if (opts?.params) {",
    "    for (const [k, v] of Object.entries(opts.params)) url = url.replace(`[${k}]`, String(v));",
    "  }",
    "  if (opts?.query) {",
    "    const p = new URLSearchParams();",
    "    for (const [k, v] of Object.entries(opts.query)) p.append(k, String(v));",
    "    url += `?${p}`;",
    "  }",
    '  if (url.startsWith("/") && typeof window === "undefined") {',
    `    url = \`http://\${process.env.BUNBOX_HOSTNAME || "${
      config?.hostname || "localhost"
    }"\ }:\${process.env.BUNBOX_PORT || "${config?.port || 3000}"}\${url}\`;`,
    "  }",
    "  const res = await fetch(url, {",
    "    method,",
    '    headers: { "Content-Type": "application/json", ...opts?.headers },',
    '    body: opts?.body && method !== "GET" ? JSON.stringify(opts.body) : undefined,',
    "  });",
    "  if (!res.ok) throw new Error(await res.text());",
    "  const contentType = res.headers.get('content-type') || '';",
    "  if (contentType.includes('text/event-stream')) {",
    "    return parseSSE(res) as any;",
    "  }",
    "  if (res.headers.has('X-Bunbox-Stream')) {",
    "    return parseStream(res) as any;",
    "  }",
    "  return res.json();",
    "}",
    ""
  );

  // Add helper to create API method with hooks
  lines.push(
    "type ApiMethodOptions<TParams, TQuery, TBody> = { params?: TParams; query?: TQuery; body?: TBody; headers?: HeadersInit };",
    "",
    "type ApiMethod<TResponse, TParams, TQuery, TBody> = {",
    "  (opts?: ApiMethodOptions<TParams, TQuery, TBody>): Promise<ClientResponse<TResponse>>;",
    "  useQuery: (opts?: UseQueryOptions<TParams, TQuery, TBody>) => UseQueryResult<ClientResponse<TResponse>>;",
    "  useStream: (opts?: UseStreamOptions<TParams, TQuery, TBody>) => UseStreamResult<TResponse extends { __type: infer U } ? U : TResponse>;",
    "};",
    "",
    "function createApiMethod<TResponse, TParams = Record<string, unknown>, TQuery = Record<string, unknown>, TBody = unknown>(",
    "  method: string,",
    "  path: string",
    "): ApiMethod<TResponse, TParams, TQuery, TBody> {",
    "  const fn = (opts?: ApiMethodOptions<TParams, TQuery, TBody>) => request<TResponse, TParams, TQuery, TBody>(method, path, opts);",
    "  fn.useQuery = (opts?: UseQueryOptions<TParams, TQuery, TBody>) => createQueryHook<ClientResponse<TResponse>>(method, path, opts);",
    "  fn.useStream = (opts?: UseStreamOptions<TParams, TQuery, TBody>) => {",
    "    type ExtractedType = TResponse extends { __type: infer U } ? U : TResponse;",
    "    return useStreamHook<ExtractedType>(fn, opts);",
    "  };",
    "  return fn as ApiMethod<TResponse, TParams, TQuery, TBody>;",
    "}",
    ""
  );

  // Build API object
  lines.push("export const api = {");
  const apiLines = buildApiObject(routeTree, 1);
  if (apiLines.length > 0) {
    lines.push(...apiLines);
  }
  lines.push("};");

  return lines.join("\n");
}
