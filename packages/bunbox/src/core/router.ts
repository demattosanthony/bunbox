/**
 * Bunbox Router - File-based routing system
 */

import type { Route, RouteMatch } from "./types";

/**
 * Route type transformation configuration
 */
const ROUTE_TRANSFORMS: Record<
  "page" | "api" | "ws" | "socket",
  { prefix: RegExp; replacement: string; suffix: RegExp }
> = {
  page: {
    prefix: /^app/,
    replacement: "",
    suffix: /\/page\.(tsx|ts|jsx|js)$/,
  },
  api: {
    prefix: /^app/,
    replacement: "",
    suffix: /\/route\.(tsx|ts|jsx|js)$/,
  },
  ws: {
    prefix: /^ws/,
    replacement: "/ws",
    suffix: /\/route\.(tsx|ts|jsx|js)$/,
  },
  socket: {
    prefix: /^sockets/,
    replacement: "/sockets",
    suffix: /\/route\.(tsx|ts|jsx|js)$/,
  },
};

/**
 * Transform file path to route path based on type
 */
function transformFilePath(
  filePath: string,
  type: "page" | "api" | "ws" | "socket"
): string {
  // Special case for root page
  if (type === "page" && filePath.match(/^page\.(tsx|ts|jsx|js)$/)) {
    return "";
  }

  const transform = ROUTE_TRANSFORMS[type];
  return filePath
    .replace(transform.prefix, transform.replacement)
    .replace(transform.suffix, "");
}

/**
 * Convert file path to route pattern
 * /app/blog/[slug]/page.tsx -> /blog/:slug
 * /app/api/users/[id]/route.ts -> /api/users/:id
 * /sockets/chat/[room]/route.ts -> /sockets/chat/:room
 */
export function filePathToRoute(
  filePath: string,
  type: "page" | "api" | "ws" | "socket"
): Route {
  let routePath = transformFilePath(filePath, type);

  // Extract parameter names and convert [param] to :param
  const paramNames: string[] = [];
  routePath = routePath.replace(/\[([^\]]+)\]/g, (_, paramName) => {
    paramNames.push(paramName);
    return ":" + paramName;
  });

  // Normalize and create regex pattern
  routePath = normalizeRoutePath(routePath);
  const pattern = new RegExp(
    "^" + routePath.replace(/:[^/]+/g, "([^/]+)") + "$"
  );

  return {
    pattern,
    filepath: filePath,
    paramNames,
    type,
  };
}

/**
 * Normalize route path to ensure it starts with /
 */
export function normalizeRoutePath(path: string): string {
  if (path === "" || path === "//") {
    return "/";
  }
  if (!path.startsWith("/")) {
    return "/" + path;
  }
  return path;
}

/**
 * Convert route path to URL path (removes file extensions, normalizes)
 * Used by both server and generator
 */
export function routePathToUrl(filePath: string): string {
  let route = filePath
    .replace(/^app\/?/, "")
    .replace(/\/page\.(tsx|ts|jsx|js)$/, "")
    .replace(/page\.(tsx|ts|jsx|js)$/, "")
    .replace(/\/layout\.(tsx|ts|jsx|js)$/, "")
    .replace(/layout\.(tsx|ts|jsx|js)$/, "");

  return normalizeRoutePath(route);
}

/**
 * Safely parse request URL, handling both absolute and relative URLs.
 * In production behind reverse proxies, req.url may be just "/" instead of full URL.
 */
export function getRequestUrl(req: Request): URL {
  if (req.url.includes("://")) {
    return new URL(req.url);
  }
  const host = req.headers.get("host") || "localhost";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  return new URL(req.url, `${protocol}://${host}`);
}

/**
 * Match a URL path against a route
 */
export function matchRoute(req: Request, route: Route): RouteMatch | null {
  const urlObj = getRequestUrl(req);
  const path = urlObj.pathname;

  const match = path.match(route.pattern);
  if (!match) {
    return null;
  }

  const params: Record<string, string> = {};
  route.paramNames.forEach((name, i) => {
    params[name] = match[i + 1] || "";
  });

  const query: Record<string, string> = {};
  urlObj.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return { params, query };
}

/**
 * Count static segments in a path (used for route specificity)
 */
export function countStaticSegments(path: string): number {
  return path.split("/").filter((s) => !s.startsWith("[")).length;
}

/**
 * Sort routes by specificity (more specific routes first)
 * Routes with more static segments are considered more specific
 */
export function sortRoutes(routes: Route[]): Route[] {
  return routes.sort((a, b) => {
    const aStatic = countStaticSegments(a.filepath);
    const bStatic = countStaticSegments(b.filepath);

    if (aStatic !== bStatic) {
      return bStatic - aStatic;
    }

    // Shorter paths with params are more specific
    return a.filepath.length - b.filepath.length;
  });
}

/**
 * Convert Bunbox route pattern to Bun.serve route path
 * Converts [param] syntax to :param for Bun's router
 */
export function toBunRoutePath(route: Route): string {
  const path = transformFilePath(route.filepath, route.type).replace(
    /\[([^\]]+)\]/g,
    ":$1"
  );

  return normalizeRoutePath(path);
}
