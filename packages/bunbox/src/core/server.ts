/**
 * Bunbox Server - Main server implementation
 */

import { join } from "path";
import type { ResolvedBunboxConfig } from "./config";
import { matchRoute, sortRoutes, toBunRoutePath } from "./router";
import {
  scanPageRoutes,
  scanApiRoutes,
  scanWsRoutes,
  scanSocketRoutes,
  scanLayouts,
  scanWorker,
} from "./scanner";
import { renderPage, checkUseServer, generateHTMLShell } from "./ssr";
import { generateRoutesFile, generateApiClient } from "./generator";
import { createWatcher } from "./watcher";
import { hasBuildArtifacts, getBuildMetadata } from "./build";
import {
  resolveAbsolutePath,
  dynamicImport,
  fileExists,
  transpileForBrowser,
  getFaviconContentType,
  getBunboxDir,
} from "./utils";
import { getApplicableLayoutPaths } from "./shared";
import type { Server } from "bun";
import type {
  Route,
  BunboxRequest,
  ApiRouteModule,
  RouteHandler,
  RouteHandlers,
  WsRouteModule,
  ServerWebSocket,
  WebSocketData,
  WebSocketContext,
  PageMetadata,
  LayoutModule,
  SocketRouteModule,
  SocketUser,
  SocketMessage,
  SocketContext,
  WorkerModule,
  WorkerCleanup,
  BunboxServerConfig,
} from "./types";

// Re-export types for external use
export type {
  RouteHandler,
  WsRouteModule,
  ServerWebSocket,
  WebSocketContext,
  BunboxServerConfig,
};

// HTTP methods supported by API routes
const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * WebSocket context implementation
 * Provides convenient broadcasting methods for WebSocket routes
 */
class WebSocketContextImpl implements WebSocketContext {
  constructor(
    public readonly topic: string,
    private readonly server: Server<WebSocketData>
  ) {}

  broadcast(
    data: string | ArrayBuffer | Uint8Array,
    compress?: boolean
  ): number {
    return this.server.publish(this.topic, data, compress);
  }

  broadcastJSON(data: any, compress?: boolean): number {
    return this.server.publish(this.topic, JSON.stringify(data), compress);
  }
}

/**
 * Socket context implementation
 * Provides methods for socket route handlers
 */
class SocketContextImpl implements SocketContext {
  constructor(
    private readonly topic: string,
    private readonly server: Server<WebSocketData>,
    private readonly users: Map<string, SocketUser>
  ) {}

  broadcast<T = any>(type: string, data: T): void {
    const message: SocketMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
      userId: "",
    };
    this.server.publish(this.topic, JSON.stringify(message));
  }

  sendTo<T = any>(userId: string, type: string, data: T): void {
    // Send to a specific user by iterating through subscriptions
    // Note: This is a simple implementation. For large scale, consider a userId->ws map
    const message: SocketMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
      userId,
    };

    const user = this.users.get(userId);
    if (user) {
      // Publish to a user-specific topic (requires manual subscription)
      this.server.publish(`socket-user-${userId}`, JSON.stringify(message));
    }
  }

  getUsers(): SocketUser[] {
    return Array.from(this.users.values());
  }
}

class BunboxServer {
  private config: ResolvedBunboxConfig;
  private pageRoutes: Route[] = [];
  private apiRoutes: Route[] = [];
  private wsRoutes: Route[] = [];
  private socketRoutes: Route[] = [];
  private layouts: Map<string, string> = new Map();
  private wsHandlers: Map<string, WsRouteModule> = new Map();
  private socketHandlers: Map<string, SocketRouteModule> = new Map();
  private socketUsers: Map<string, Map<string, SocketUser>> = new Map(); // topic -> userId -> user
  private serverSidePages: Set<string> = new Set();
  private rootLayoutPath: string | null = null;
  private cachedMetadata: PageMetadata | null = null;
  private hmrClients: Set<ServerWebSocket> = new Set();
  private watcher: { close: () => void } | null = null;
  private server: Server<WebSocketData> | null = null;
  private workerPath: string | null = null;
  private workerInstance: WorkerCleanup | void | null = null;

  constructor(config: ResolvedBunboxConfig) {
    this.config = config;
  }

  /**
   * Initialize the server by scanning routes
   */
  async init() {
    const startTime = Date.now();

    // Scan for worker file first
    this.workerPath = await scanWorker(this.config.appDir);

    // Scan all route types (needed to determine worker-only mode)
    this.pageRoutes = sortRoutes(await scanPageRoutes(this.config.appDir));
    this.apiRoutes = sortRoutes(await scanApiRoutes(this.config.appDir));
    this.wsRoutes = sortRoutes(await scanWsRoutes(this.config.wsDir));
    this.socketRoutes = sortRoutes(
      await scanSocketRoutes(this.config.socketsDir)
    );

    const isWorkerOnly = this.isWorkerOnly();

    // Skip HTTP-related initialization in worker-only mode
    if (!isWorkerOnly) {
      this.layouts = await scanLayouts(this.config.appDir);

      // Check for pre-built artifacts in production
      const useBuildArtifacts =
        !this.config.development && (await hasBuildArtifacts());

      if (useBuildArtifacts) {
        const metadata = await getBuildMetadata();
        if (metadata) {
          console.log(
            ` ○ Using pre-built artifacts (${metadata.routes.pages} pages, ${metadata.routes.apis} APIs)`
          );
        }
      } else {
        // Generate routes file for client-side hydration
        await generateRoutesFile(this.config.appDir);

        // Generate typed API client
        await generateApiClient(this.config.appDir);
      }

      // Check which pages have "use server"
      await this.detectServerSidePages();

      // Load WebSocket handlers in production
      if (!this.config.development) {
        await this.loadWsHandlers();
        await this.loadSocketHandlers();
      }

      // Load and cache metadata from root layout
      if (this.layouts.has("/")) {
        this.rootLayoutPath = join(this.config.appDir, this.layouts.get("/")!);
        this.cachedMetadata = await this.loadMetadata();
      }
    }

    // Note: Worker is NOT started here in production mode
    // It will be started after the server is listening
    // In development mode with --hot, we can start it here
    if (this.config.development && this.workerPath) {
      await this.startWorker();
    }

    const duration = Date.now() - startTime;
    const totalRoutes =
      this.pageRoutes.length +
      this.apiRoutes.length +
      this.wsRoutes.length +
      this.socketRoutes.length;

    if (isWorkerOnly) {
      console.log(` ✓ Worker ready in ${duration}ms`);
    } else if (totalRoutes > 0) {
      console.log(` ✓ Ready in ${duration}ms (${totalRoutes} routes)`);
    } else {
      console.log(` ✓ Ready in ${duration}ms`);
    }

    // Set up file watcher in development mode
    if (this.config.development) {
      this.watcher = createWatcher({
        appDir: this.config.appDir,
        wsDir: this.config.wsDir,
        socketsDir: this.config.socketsDir,
        onChange: () => this.handleFileChange(),
      });
    }
  }

  /**
   * Detect which pages have "use server" directive
   */
  private async detectServerSidePages() {
    for (const route of this.pageRoutes) {
      const pagePath = join(this.config.appDir, route.filepath);
      try {
        const hasUseServer = await checkUseServer(pagePath);
        if (hasUseServer) {
          this.serverSidePages.add(route.filepath);
        }
      } catch (error) {
        // Silently continue - page might not exist
      }
    }
  }

  /**
   * Start worker process
   */
  private async startWorker() {
    if (!this.workerPath) return;

    const workerFullPath = join(this.config.appDir, this.workerPath);
    const absolutePath = resolveAbsolutePath(workerFullPath);

    try {
      const module = await dynamicImport<WorkerModule>(
        absolutePath,
        this.config.development
      );

      if (module.default) {
        this.workerInstance = await module.default();
        if (this.config.development) {
          console.log(" ○ Worker started");
        }
      }
    } catch (error) {
      console.error("Failed to start worker:", error);
    }
  }

  /**
   * Stop worker process
   */
  private async stopWorker() {
    if (this.workerInstance) {
      // If worker instance has a cleanup method, call it
      if (typeof this.workerInstance?.close === "function") {
        try {
          await this.workerInstance.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      this.workerInstance = null;
    }
  }

  /**
   * Convert route filepath to filesystem path
   */
  private getWsPath(filepath: string): string {
    return join(this.config.wsDir, filepath.replace(/^ws\//, ""));
  }

  /**
   * Load WebSocket handlers (production only)
   */
  private async loadWsHandlers() {
    for (const route of this.wsRoutes) {
      const wsPath = this.getWsPath(route.filepath);
      try {
        const module = await dynamicImport<WsRouteModule>(wsPath, false);
        this.wsHandlers.set(route.filepath, module);
      } catch (error) {
        console.error(`Failed to load WebSocket handler: ${wsPath}`, error);
      }
    }
  }

  /**
   * Handle file changes in development mode
   */
  private async handleFileChange() {
    const startTime = Date.now();
    console.log(" ○ Reloading...");

    // Restart worker if exists
    if (this.workerPath) {
      await this.stopWorker();
      await this.startWorker();
    }

    // Send reload message to all connected HMR clients
    if (this.hmrClients.size > 0) {
      for (const client of this.hmrClients) {
        try {
          client.send(JSON.stringify({ type: "reload" }));
        } catch (error) {
          // Client might have disconnected
          this.hmrClients.delete(client);
        }
      }

      // Small delay to ensure clients receive the message
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const duration = Date.now() - startTime;
    console.log(` ✓ Reloaded in ${duration}ms`);
  }

  /**
   * Get WebSocket handler (with hot reload support in development)
   */
  private async getWsHandler(
    filepath: string
  ): Promise<WsRouteModule | undefined> {
    if (!this.config.development) {
      return this.wsHandlers.get(filepath);
    }

    try {
      return await dynamicImport<WsRouteModule>(this.getWsPath(filepath), true);
    } catch (error) {
      console.error(`Failed to load WebSocket handler: ${filepath}`, error);
      return undefined;
    }
  }

  /**
   * Convert route filepath to socket filesystem path
   */
  private getSocketPath(filepath: string): string {
    return join(this.config.socketsDir, filepath.replace(/^sockets\//, ""));
  }

  /**
   * Load socket handlers (production only)
   */
  private async loadSocketHandlers() {
    for (const route of this.socketRoutes) {
      const socketPath = this.getSocketPath(route.filepath);
      try {
        const module = await dynamicImport<SocketRouteModule>(
          socketPath,
          false
        );
        this.socketHandlers.set(route.filepath, module);
      } catch (error) {
        console.error(`Failed to load socket handler: ${socketPath}`, error);
      }
    }
  }

  /**
   * Get socket handler (with hot reload support in development)
   */
  private async getSocketHandler(
    filepath: string
  ): Promise<SocketRouteModule | undefined> {
    if (!this.config.development) {
      return this.socketHandlers.get(filepath);
    }

    try {
      return await dynamicImport<SocketRouteModule>(
        this.getSocketPath(filepath),
        true
      );
    } catch (error) {
      console.error(`Failed to load socket handler: ${filepath}`, error);
      return undefined;
    }
  }

  /**
   * Create topic name from route filepath
   * "ws/chat/route.ts" -> "ws-chat"
   * "sockets/chat/route.ts" -> "socket-chat"
   */
  private getTopicFromRoute(filepath: string): string {
    return filepath.replace(/\/route\.ts$/, "").replaceAll("/", "-");
  }

  /**
   * Load metadata from root layout
   */
  private async loadMetadata(): Promise<PageMetadata> {
    if (!this.rootLayoutPath) {
      return {};
    }

    try {
      const layoutModule = await dynamicImport(
        this.rootLayoutPath,
        this.config.development
      );
      return layoutModule.metadata || {};
    } catch (error) {
      if (this.config.development) {
        console.warn("Could not load metadata from root layout:", error);
      }
      return {};
    }
  }

  /**
   * Get cached metadata or empty object
   */
  private getMetadata(): PageMetadata {
    return this.cachedMetadata || {};
  }

  /**
   * Build client script route
   */
  private buildClientRoute(): RouteHandlers {
    return {
      GET: async () => {
        const bunboxDir = getBunboxDir();
        const clientJsPath = join(bunboxDir, "client.js");

        // In production, try to serve pre-built client.js first
        if (!this.config.development && (await fileExists(clientJsPath))) {
          const file = Bun.file(clientJsPath);
          return new Response(file, {
            headers: {
              "Content-Type": "application/javascript",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }

        // Development or no pre-built bundle: transpile on-demand
        const entryPath = join(bunboxDir, "entry.ts");

        if (!(await fileExists(entryPath))) {
          console.error("Client entry point not found at:", entryPath);
          return new Response(
            "Client script not found. Try restarting the server.",
            { status: 404 }
          );
        }

        const result = await transpileForBrowser([entryPath], {
          minify: !this.config.development,
          external: [],
        });

        if (result.success && result.output) {
          return new Response(result.output, {
            headers: {
              "Content-Type": "application/javascript",
              "Cache-Control": this.config.development
                ? "no-cache"
                : "public, max-age=3600",
            },
          });
        }

        console.error("Failed to build client script:", result.logs);
        return new Response("Failed to build client script", { status: 500 });
      },
    };
  }

  /**
   * Build styles route
   */
  private buildStylesRoute(): RouteHandlers {
    return {
      GET: async () => {
        const cssPath = join(this.config.appDir, "index.css");
        const file = Bun.file(cssPath);

        if (await file.exists()) {
          return new Response(file, {
            headers: {
              "Content-Type": "text/css",
              "Cache-Control": this.config.development
                ? "no-cache"
                : "public, max-age=3600",
            },
          });
        }

        return new Response("/* No CSS file found */", {
          headers: { "Content-Type": "text/css" },
        });
      },
    };
  }

  /**
   * Build favicon route
   */
  private buildFaviconRoute(): RouteHandlers {
    return {
      GET: async () => {
        const metadata = this.getMetadata();
        if (!metadata.favicon) {
          return new Response("No favicon configured", { status: 404 });
        }

        const faviconPath = join(this.config.appDir, metadata.favicon);
        const file = Bun.file(faviconPath);

        if (await file.exists()) {
          const contentType = getFaviconContentType(metadata.favicon);

          return new Response(file, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": this.config.development
                ? "no-cache"
                : "public, max-age=86400",
            },
          });
        }

        return new Response("Favicon not found", { status: 404 });
      },
    };
  }

  /**
   * Handle API request with dynamic import in development
   */
  private async handleDynamicApi(
    req: Request,
    route: Route,
    absolutePath: string,
    method: HttpMethod
  ): Promise<Response> {
    try {
      const module = await dynamicImport<ApiRouteModule>(absolutePath, true);
      const handler = module[method];
      if (!handler) {
        return new Response("Method not found", { status: 404 });
      }
      return await this.handleApiMethod(req, route, handler);
    } catch (error) {
      console.error(
        `Error loading API route ${method} ${toBunRoutePath(route)}:`,
        error
      );
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  /**
   * Build all routes (internal, API, and page routes)
   */
  private async buildRoutes(): Promise<Record<string, RouteHandlers>> {
    const routes: Record<string, RouteHandlers> = {
      // Bunbox internal routes
      "/__bunbox/client.js": this.buildClientRoute(),
      "/__bunbox/styles.css": this.buildStylesRoute(),
      "/__bunbox/favicon": this.buildFaviconRoute(),
    };

    // Build API routes
    for (const route of this.apiRoutes) {
      const routePath = toBunRoutePath(route);
      const apiPath = join(this.config.appDir, route.filepath);
      const absolutePath = resolveAbsolutePath(apiPath);

      if (this.config.development) {
        // Dynamic handlers for hot reload
        const handlers: RouteHandlers = {};
        for (const method of HTTP_METHODS) {
          handlers[method] = (req: Request) =>
            this.handleDynamicApi(req, route, absolutePath, method);
        }
        routes[routePath] = handlers;
      } else {
        // Production: import once and build handlers for existing methods
        try {
          const module = await dynamicImport<ApiRouteModule>(
            absolutePath,
            false
          );
          const handlers: RouteHandlers = {};

          for (const method of HTTP_METHODS) {
            if (module[method]) {
              handlers[method] = (req: Request) =>
                this.handleApiMethod(req, route, module[method]!);
            }
          }

          routes[routePath] = handlers;
        } catch (error) {
          console.error(`Failed to load API route: ${apiPath}`, error);
        }
      }
    }

    // Build SSR page routes
    for (const route of this.pageRoutes) {
      if (this.serverSidePages.has(route.filepath)) {
        const routePath = toBunRoutePath(route);
        routes[routePath] = {
          GET: (req: Request) => this.handlePageRequest(req, route),
        };
      }
    }

    return routes;
  }

  /**
   * Parse request body based on Content-Type
   */
  private async parseRequestBody(req: Request): Promise<any> {
    // Skip body parsing for methods that typically don't have bodies
    if (
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.method === "OPTIONS"
    ) {
      return null;
    }

    // Check if there's actually a body to parse
    if (!req.body) {
      return null;
    }

    const contentType = req.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        const text = await req.text();
        return text ? JSON.parse(text) : null;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        return text ? Object.fromEntries(new URLSearchParams(text)) : null;
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const result: Record<string, any> = {};
        formData.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      } else if (contentType.includes("text/")) {
        return await req.text();
      } else {
        // For other content types, try JSON first, fallback to text
        const text = await req.text();
        if (!text) return null;
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
    } catch (error) {
      console.warn("Failed to parse request body:", error);
      return null;
    }
  }

  /**
   * Handle API method call
   */
  private async handleApiMethod(
    req: Request,
    route: Route,
    handler: RouteHandler
  ): Promise<Response> {
    const match = matchRoute(req.url, route);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    // Create extended request object with params, query, and parsed body
    const bunboxReq = Object.create(req, {
      params: { value: match.params, writable: false, enumerable: true },
      query: { value: match.query, writable: false, enumerable: true },
      body: {
        value: await this.parseRequestBody(req),
        writable: false,
        enumerable: true,
      },
    }) as BunboxRequest;

    try {
      return await handler(bunboxReq);
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
      const absolutePagePath = resolveAbsolutePath(pagePath);
      const pageModule = await dynamicImport(
        absolutePagePath,
        this.config.development
      );

      // Find applicable layouts using shared utility
      const layoutModules: LayoutModule[] = [];
      const urlPath = new URL(req.url).pathname;
      const layoutPaths = getApplicableLayoutPaths(urlPath);

      for (const path of layoutPaths) {
        if (this.layouts.has(path)) {
          const layoutPath = join(this.config.appDir, this.layouts.get(path)!);
          const absoluteLayoutPath = resolveAbsolutePath(layoutPath);
          layoutModules.push(
            await dynamicImport(absoluteLayoutPath, this.config.development)
          );
        }
      }

      const stream = await renderPage(
        pageModule,
        layoutModules,
        match.params,
        match.query,
        this.config.development
      );

      return new Response(stream, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Page route error:", error);
      return new Response(`Error rendering page: ${error}`, { status: 500 });
    }
  }

  /**
   * Check if running in worker-only mode (no routes, only worker)
   */
  isWorkerOnly(): boolean {
    return (
      this.workerPath !== null &&
      this.pageRoutes.length === 0 &&
      this.apiRoutes.length === 0 &&
      this.wsRoutes.length === 0 &&
      this.socketRoutes.length === 0
    );
  }

  /**
   * Build Bun.serve() configuration object
   */
  async getServerConfig(): Promise<BunboxServerConfig> {
    await this.init();

    // Build routes
    const routes = await this.buildRoutes();

    // Serve HTML shell for all client-side routed pages
    routes["/*"] = {
      GET: async (req: Request) => {
        const url = new URL(req.url);

        // Check for public directory files first
        if (
          !url.pathname.startsWith("/__bunbox") &&
          !url.pathname.startsWith("/api") &&
          !url.pathname.startsWith("/ws")
        ) {
          const publicPath = join(this.config.publicDir, url.pathname);
          const file = Bun.file(publicPath);

          if (await file.exists()) {
            const headers: Record<string, string> = {
              "Cache-Control": this.config.development
                ? "no-cache"
                : "public, max-age=3600",
            };

            // Ensure UTF-8 encoding for text files
            const contentType = file.type;
            if (contentType.startsWith("text/")) {
              headers["Content-Type"] = `${contentType}; charset=utf-8`;
            }

            return new Response(file, { headers });
          }
        }

        const html = generateHTMLShell(
          {},
          Object.fromEntries(url.searchParams),
          this.getMetadata(),
          this.config.development
        );

        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      },
    };

    return {
      port: this.config.port,
      hostname: this.config.hostname,
      routes,
      workerOnly: this.isWorkerOnly(),
      workerPath: this.workerPath,
      startWorkerAfterListen: async () => {
        // Start worker in production after server is listening
        if (!this.config.development && this.workerPath) {
          await this.startWorker();
        }
      },
      workerCleanup: async () => {
        await this.stopWorker();
      },

      fetch: async (req: Request, server: Server<WebSocketData>) => {
        // Store server reference on first call
        if (!this.server) {
          this.server = server;
        }

        const url = new URL(req.url);

        // Handle HMR WebSocket in development mode
        if (this.config.development && url.pathname === "/__bunbox/hmr") {
          if (server.upgrade(req, { data: { type: "hmr" } })) {
            return;
          }
          return new Response("WebSocket upgrade failed", { status: 400 });
        }

        // Handle WebSocket routes
        if (url.pathname.startsWith("/ws/")) {
          return this.handleWebSocketUpgrade(req, server);
        }

        // Handle Socket routes
        if (url.pathname.startsWith("/sockets/")) {
          return this.handleSocketUpgrade(req, server);
        }

        return new Response("Not Found", { status: 404 });
      },

      websocket: {
        open: (ws: ServerWebSocket) => {
          const data = ws.data as WebSocketData;

          if (data.type === "hmr") {
            this.hmrClients.add(ws);
            return;
          }

          if (data.type === "socket") {
            ws.subscribe(data.topic);
            ws.subscribe(`socket-user-${data.user.id}`);

            if (!this.socketUsers.has(data.topic)) {
              this.socketUsers.set(data.topic, new Map());
            }
            this.socketUsers.get(data.topic)!.set(data.user.id, data.user);
            data.handler.onJoin?.(data.user, data.ctx);
            return;
          }

          // WebSocket connection
          ws.subscribe(data.topic);
          data.handler.onOpen?.(ws, data.ctx);
        },
        message: (ws: ServerWebSocket, message: string | Buffer) => {
          const data = ws.data as WebSocketData;

          if (data.type === "hmr") return;

          if (data.type === "socket") {
            // Parse socket message
            try {
              const parsed =
                typeof message === "string" ? JSON.parse(message) : message;
              const socketMessage: SocketMessage = {
                type: parsed.type,
                data: parsed.data,
                timestamp: Date.now(),
                userId: data.user.id,
              };
              data.handler.onMessage?.(data.user, socketMessage, data.ctx);
            } catch (error) {
              console.error("Failed to parse socket message:", error);
            }
            return;
          }

          // WebSocket message
          data.handler.onMessage?.(ws, message, data.ctx);
        },
        close: (ws: ServerWebSocket, code?: number, reason?: string) => {
          const data = ws.data as WebSocketData;

          if (data.type === "hmr") {
            this.hmrClients.delete(ws);
            return;
          }

          if (data.type === "socket") {
            // Remove user from socket users
            const users = this.socketUsers.get(data.topic);
            if (users) {
              users.delete(data.user.id);
              if (users.size === 0) {
                this.socketUsers.delete(data.topic);
              }
            }

            // Call user's onLeave handler
            data.handler.onLeave?.(data.user, data.ctx);
            return;
          }

          // WebSocket close
          data.handler.onClose?.(ws, data.ctx, code, reason);
        },
      },

      development: this.config.development && {
        hmr: true,
        console: true,
      },
    };
  }

  /**
   * Handle WebSocket upgrade request
   */
  private async handleWebSocketUpgrade(
    req: Request,
    server: Server<WebSocketData>
  ): Promise<Response | undefined> {
    for (const route of this.wsRoutes) {
      const match = matchRoute(req.url, route);
      if (!match) continue;

      const handler = await this.getWsHandler(route.filepath);
      if (!handler) continue;

      const topic = this.getTopicFromRoute(route.filepath);

      // Check for custom upgrade logic
      if (handler.upgrade) {
        const upgradeResult = await handler.upgrade(req);
        if (upgradeResult === false) continue;
      }

      // Create context and upgrade connection
      const ctx = new WebSocketContextImpl(topic, server);
      const wsData: WebSocketData = {
        type: "ws",
        route: route.filepath,
        topic,
        handler,
        ctx,
      };

      if (server.upgrade(req, { data: wsData })) return;
    }

    return new Response("WebSocket route not found", { status: 404 });
  }

  /**
   * Handle Socket upgrade request
   */
  private async handleSocketUpgrade(
    req: Request,
    server: Server<WebSocketData>
  ): Promise<Response | undefined> {
    for (const route of this.socketRoutes) {
      const match = matchRoute(req.url, route);
      if (!match) continue;

      const handler = await this.getSocketHandler(route.filepath);
      if (!handler) continue;

      const topic = this.getTopicFromRoute(route.filepath);

      // Extract user data from URL query parameters
      const url = new URL(req.url);
      const username = url.searchParams.get("username") || "Anonymous";
      const userData: { username: string; [key: string]: any } = { username };

      // Add any additional query params as user data
      url.searchParams.forEach((value, key) => {
        if (key !== "username") {
          userData[key] = value;
        }
      });

      // Check for authorization
      if (handler.onAuthorize) {
        const authorized = await handler.onAuthorize(req, userData);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Generate unique user ID
      const userId = crypto.randomUUID();
      const user: SocketUser = {
        id: userId,
        data: userData,
      };

      // Create or get users map for this topic
      if (!this.socketUsers.has(topic)) {
        this.socketUsers.set(topic, new Map());
      }
      const users = this.socketUsers.get(topic)!;

      // Create context and upgrade connection
      const ctx = new SocketContextImpl(topic, server, users);
      const socketData: WebSocketData = {
        type: "socket",
        route: route.filepath,
        topic,
        user,
        handler,
        ctx,
      };

      if (server.upgrade(req, { data: socketData })) return;
    }

    return new Response("Socket route not found", { status: 404 });
  }
}

/**
 * Build server configuration for Bun.serve()
 */
export async function buildServerConfig(config: ResolvedBunboxConfig) {
  const server = new BunboxServer(config);
  return await server.getServerConfig();
}
