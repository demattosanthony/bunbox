/**
 * Bunbox Server - Main server implementation
 */

import { join } from "path";
import { matchRoute, sortRoutes, type Route } from "./router";
import {
  scanPageRoutes,
  scanApiRoutes,
  scanWsRoutes,
  scanLayouts,
} from "./scanner";
import { renderPage, type SSRContext, checkUseServer } from "./ssr";
import { generateRoutesFile } from "./generator";

export interface BunboxConfig {
  port?: number;
  hostname?: string;
  appDir?: string;
  wsDir?: string;
  development?: boolean;
}

export interface ApiHandler {
  GET?: (req: Request, context: SSRContext) => Response | Promise<Response>;
  POST?: (req: Request, context: SSRContext) => Response | Promise<Response>;
  PUT?: (req: Request, context: SSRContext) => Response | Promise<Response>;
  DELETE?: (req: Request, context: SSRContext) => Response | Promise<Response>;
  PATCH?: (req: Request, context: SSRContext) => Response | Promise<Response>;
}

export interface WsHandler {
  open?: (ws: any) => void;
  message?: (ws: any, message: string | Buffer) => void;
  close?: (ws: any) => void;
  upgrade?: (req: Request, server: any) => boolean | { data?: any };
}

export class BunboxServer {
  private config: Required<BunboxConfig>;
  private pageRoutes: Route[] = [];
  private apiRoutes: Route[] = [];
  private wsRoutes: Route[] = [];
  private layouts: Map<string, string> = new Map();
  private wsHandlers: Map<string, WsHandler> = new Map();
  private serverSidePages: Set<string> = new Set();

  constructor(config: BunboxConfig = {}) {
    this.config = {
      port: config.port || 3000,
      hostname: config.hostname || "localhost",
      appDir: config.appDir || join(process.cwd(), "app"),
      wsDir: config.wsDir || join(process.cwd(), "ws"),
      development: config.development ?? true,
    };
  }

  /**
   * Initialize the server by scanning routes
   */
  async init() {
    console.log("🔍 Scanning routes...");

    // Scan all route types
    this.pageRoutes = sortRoutes(await scanPageRoutes(this.config.appDir));
    this.apiRoutes = sortRoutes(await scanApiRoutes(this.config.appDir));
    this.wsRoutes = sortRoutes(await scanWsRoutes(this.config.wsDir));
    this.layouts = await scanLayouts(this.config.appDir);

    // Generate routes file for client-side hydration
    await generateRoutesFile(this.config.appDir);

    // Check which pages have "use server"
    for (const route of this.pageRoutes) {
      const pagePath = join(this.config.appDir, route.filepath);
      try {
        const hasUseServer = await checkUseServer(pagePath);
        if (hasUseServer) {
          this.serverSidePages.add(route.filepath);
        }
      } catch (error) {
        console.error(`Failed to check page: ${pagePath}`, error);
      }
    }

    // Load WebSocket handlers
    for (const route of this.wsRoutes) {
      const wsPath = join(
        this.config.wsDir,
        route.filepath.replace(/^ws\//, "")
      );
      try {
        const module = await import(wsPath);
        this.wsHandlers.set(route.filepath, module);
      } catch (error) {
        console.error(`Failed to load WebSocket handler: ${wsPath}`, error);
      }
    }

    console.log(`📄 Found ${this.pageRoutes.length} page routes`);
    console.log(`🔌 Found ${this.apiRoutes.length} API routes`);
    console.log(`🔗 Found ${this.wsRoutes.length} WebSocket routes`);
    console.log(`📐 Found ${this.layouts.size} layouts`);
    console.log(`⚡️ Found ${this.serverSidePages.size} server-side pages`);
  }

  /**
   * Build routes object for Bun.serve()
   */
  private async buildRoutes(): Promise<Record<string, any>> {
    const routes: Record<string, any> = {};

    // Add API routes
    for (const route of this.apiRoutes) {
      const routePath = this.routeToPath(route);
      const apiPath = join(this.config.appDir, route.filepath);

      try {
        const module: ApiHandler = await import(apiPath);

        // Create handler object for each HTTP method
        const handlers: Record<string, any> = {};
        if (module.GET)
          handlers.GET = (req: Request) =>
            this.handleApiMethod(req, route, module.GET!);
        if (module.POST)
          handlers.POST = (req: Request) =>
            this.handleApiMethod(req, route, module.POST!);
        if (module.PUT)
          handlers.PUT = (req: Request) =>
            this.handleApiMethod(req, route, module.PUT!);
        if (module.DELETE)
          handlers.DELETE = (req: Request) =>
            this.handleApiMethod(req, route, module.DELETE!);
        if (module.PATCH)
          handlers.PATCH = (req: Request) =>
            this.handleApiMethod(req, route, module.PATCH!);

        routes[routePath] = handlers;
      } catch (error) {
        console.error(`Failed to load API route: ${apiPath}`, error);
      }
    }

    // Add SSR page routes (only for pages with "use server")
    for (const route of this.pageRoutes) {
      if (this.serverSidePages.has(route.filepath)) {
        const routePath = this.routeToPath(route);
        routes[routePath] = (req: Request) =>
          this.handlePageRequest(req, route);
      }
    }

    return routes;
  }

  /**
   * Convert route pattern to Bun route path
   */
  private routeToPath(route: Route): string {
    let path = route.filepath;

    if (route.type === "page") {
      path = path.replace(/^app/, "").replace(/\/page\.(tsx|ts|jsx|js)$/, "");
    } else if (route.type === "api") {
      path = path.replace(/^app/, "").replace(/\/route\.(tsx|ts|jsx|js)$/, "");
    }

    // Convert [param] to :param for Bun routing
    path = path.replace(/\[([^\]]+)\]/g, ":$1");

    // Ensure path starts with /
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    return path || "/";
  }

  /**
   * Handle API method call
   */
  private async handleApiMethod(
    req: Request,
    route: Route,
    handler: (req: Request, context: SSRContext) => Response | Promise<Response>
  ): Promise<Response> {
    const match = matchRoute(req.url, route);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const context: SSRContext = {
      params: match.params,
      query: match.query,
      url: req.url,
    };

    try {
      return await handler(req, context);
    } catch (error) {
      console.error("API route error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  /**
   * Handle SSR page request (only for pages with "use server")
   */
  private async handlePageRequest(
    req: Request,
    route: Route
  ): Promise<Response> {
    const pagePath = join(this.config.appDir, route.filepath);
    const match = matchRoute(req.url, route);

    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      // Load page module
      const pageModule = await import(pagePath);

      // Find applicable layouts
      const layoutModules: any[] = [];
      const urlPath = new URL(req.url).pathname;

      // Get layouts from root to current path
      const pathParts = urlPath.split("/").filter(Boolean);
      let currentPath = "/";

      // Check root layout
      if (this.layouts.has("/")) {
        const layoutPath = join(this.config.appDir, this.layouts.get("/")!);
        layoutModules.push(await import(layoutPath));
      }

      // Check nested layouts
      for (const part of pathParts) {
        currentPath =
          currentPath === "/" ? `/${part}` : `${currentPath}/${part}`;
        if (this.layouts.has(currentPath)) {
          const layoutPath = join(
            this.config.appDir,
            this.layouts.get(currentPath)!
          );
          layoutModules.push(await import(layoutPath));
        }
      }

      const context: SSRContext = {
        params: match.params,
        query: match.query,
        url: req.url,
      };

      // Render with SSR (returns ReadableStream)
      const stream = await renderPage(pageModule, layoutModules, context);

      return new Response(stream, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Page route error:", error);
      return new Response(`Error rendering page: ${error}`, { status: 500 });
    }
  }

  /**
   * Start the server
   */
  async start() {
    await this.init();

    // Build routes
    const routes = await this.buildRoutes();

    // Import the index.html file from app directory
    const indexHtmlPath = join(this.config.appDir, "index.html");
    let indexHtml: any;
    try {
      // Dynamic import of HTML file returns the default export
      const htmlModule = await import(indexHtmlPath);
      indexHtml = htmlModule.default || htmlModule;
    } catch (error) {
      console.warn("No index.html found in app directory, using default");
    }

    // Serve index.html for all non-API routes (client-side routing)
    // This must be added AFTER specific routes so they take precedence
    if (indexHtml) {
      routes["/*"] = indexHtml;
    }

    const server = Bun.serve({
      port: this.config.port,
      hostname: this.config.hostname,
      routes,

      fetch: (req, server) => {
        // Check if this is a WebSocket upgrade request
        const url = new URL(req.url);
        if (url.pathname.startsWith("/ws/")) {
          // Find matching WebSocket route
          for (const route of this.wsRoutes) {
            const match = matchRoute(req.url, route);
            if (match) {
              const handler = this.wsHandlers.get(route.filepath);
              if (handler?.upgrade) {
                const upgradeResult = handler.upgrade(req, server);
                if (upgradeResult !== false) {
                  const data =
                    typeof upgradeResult === "object"
                      ? upgradeResult.data
                      : undefined;
                  if (
                    server.upgrade(req, {
                      data: { route: route.filepath, ...data },
                    })
                  ) {
                    return; // Connection was upgraded to WebSocket
                  }
                }
              } else {
                // Default upgrade
                const wsData: any = { route: route.filepath };
                if (server.upgrade(req, { data: wsData })) {
                  return;
                }
              }
            }
          }
        }

        // Fallback for routes not handled by routes object
        return new Response("Not Found", { status: 404 });
      },

      websocket: {
        open: (ws) => {
          const data = (ws.data || {}) as { route?: string };
          if (data?.route) {
            const handler = this.wsHandlers.get(data.route);
            handler?.open?.(ws);
          }
        },
        message: (ws, message) => {
          const data = (ws.data || {}) as { route?: string };
          if (data?.route) {
            const handler = this.wsHandlers.get(data.route);
            handler?.message?.(ws, message);
          }
        },
        close: (ws) => {
          const data = (ws.data || {}) as { route?: string };
          if (data?.route) {
            const handler = this.wsHandlers.get(data.route);
            handler?.close?.(ws);
          }
        },
      },

      development: this.config.development && {
        hmr: true,
        console: true,
      },
    });

    console.log(`
🚀 Bunbox server running!

  Local:   http://${this.config.hostname}:${this.config.port}
  
  Mode:    ${this.config.development ? "development" : "production"}
`);

    return server;
  }
}

/**
 * Create and start a Bunbox server
 */
export async function createServer(config?: BunboxConfig) {
  const server = new BunboxServer(config);
  return await server.start();
}
