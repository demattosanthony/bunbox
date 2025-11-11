/**
 * Bunbox Router - File-based routing system
 */

export interface RouteMatch {
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface Route {
  pattern: RegExp;
  filepath: string;
  paramNames: string[];
  type: "page" | "api" | "ws";
}

/**
 * Convert file path to route pattern
 * /app/blog/[slug]/page.tsx -> /blog/:slug
 * /app/api/users/[id]/route.ts -> /api/users/:id
 */
export function filePathToRoute(
  filePath: string,
  type: "page" | "api" | "ws"
): Route {
  let routePath = filePath;

  // Remove base directory
  if (type === "page") {
    routePath = routePath.replace(/^app/, "");
    routePath = routePath.replace(/\/page\.(tsx|ts|jsx|js)$/, "");
  } else if (type === "api") {
    routePath = routePath.replace(/^app\/api/, "/api");
    routePath = routePath.replace(/\/route\.(tsx|ts|jsx|js)$/, "");
  } else if (type === "ws") {
    routePath = routePath.replace(/^ws/, "/ws");
    routePath = routePath.replace(/\/route\.(tsx|ts|jsx|js)$/, "");
  }

  // Convert [param] to :param
  const paramNames: string[] = [];
  routePath = routePath.replace(/\[([^\]]+)\]/g, (_, paramName) => {
    paramNames.push(paramName);
    return ":" + paramName;
  });

  // Handle index routes
  if (routePath === "") {
    routePath = "/";
  } else if (!routePath.startsWith("/")) {
    routePath = "/" + routePath;
  }

  // Create regex pattern
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
 * Match a URL path against a route
 */
export function matchRoute(url: string, route: Route): RouteMatch | null {
  const urlObj = new URL(url);
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
 * Sort routes by specificity (more specific routes first)
 */
export function sortRoutes(routes: Route[]): Route[] {
  return routes.sort((a, b) => {
    // Count static segments (higher is more specific)
    const aStatic = a.filepath
      .split("/")
      .filter((s) => !s.startsWith("[")).length;
    const bStatic = b.filepath
      .split("/")
      .filter((s) => !s.startsWith("[")).length;

    if (aStatic !== bStatic) {
      return bStatic - aStatic;
    }

    // Shorter paths with params are more specific
    return a.filepath.length - b.filepath.length;
  });
}
