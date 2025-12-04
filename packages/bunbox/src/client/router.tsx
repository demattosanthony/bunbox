/**
 * Client-side router for Bunbox
 * Handles client-side navigation and route matching
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { getApplicableLayoutPaths } from "../core/shared.tsx";
import type { PageProps } from "../core/types";

/**
 * Import SSR context (will be null on client)
 */
let SSRRouterContext: React.Context<{
  pathname: string;
  params: Record<string, string>;
} | null> | null = null;
if (typeof window === "undefined") {
  try {
    // Import from shared.tsx which has no Node.js dependencies
    SSRRouterContext = require("../core/shared.tsx").SSRRouterContext;
  } catch {
    // SSR module not available
  }
}

/**
 * Router context for sharing navigation state
 */
interface RouterContextValue {
  pathname: string;
  navigate: (path: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export interface RouteConfig {
  path: string;
  component: React.ComponentType<PageProps>;
  pattern: RegExp;
  paramNames: string[];
}

export interface RouterProps {
  routes: RouteConfig[];
  layouts?: Map<string, React.ComponentType<{ children: React.ReactNode }>>;
  notFound?: React.ComponentType;
  ssrPages?: Set<string>;
}

/**
 * Match a URL path against a route pattern
 */
function matchRoute(
  pathname: string,
  route: RouteConfig
): { params: Record<string, string> } | null {
  const match = pathname.match(route.pattern);
  if (!match) return null;

  const params: Record<string, string> = {};
  route.paramNames.forEach((name, i) => {
    params[name] = match[i + 1] || "";
  });

  return { params };
}

/**
 * Convert route pattern to RegExp
 * /blog/[slug] -> /blog/([^/]+)
 */
export function createRoutePattern(path: string): {
  pattern: RegExp;
  paramNames: string[];
} {
  const paramNames: string[] = [];
  const regexPath = path.replace(/\[([^\]]+)\]/g, (_, paramName) => {
    paramNames.push(paramName);
    return "([^/]+)";
  });

  return {
    pattern: new RegExp("^" + regexPath + "$"),
    paramNames,
  };
}

/**
 * Get applicable layouts for a path
 */
function getLayoutsForPath(
  pathname: string,
  layouts?: Map<string, React.ComponentType<{ children: React.ReactNode }>>
): React.ComponentType<{ children: React.ReactNode }>[] {
  if (!layouts) return [];

  const applicableLayouts: React.ComponentType<{
    children: React.ReactNode;
  }>[] = [];

  // Get layout paths using shared utility
  const layoutPaths = getApplicableLayoutPaths(pathname);

  // Collect layouts in order
  for (const path of layoutPaths) {
    const layout = layouts.get(path);
    if (layout) applicableLayouts.push(layout);
  }

  return applicableLayouts;
}

/**
 * Wrap content with layouts from innermost to outermost
 */
function wrapWithLayouts(
  content: React.ReactElement,
  layouts: React.ComponentType<{ children: React.ReactNode }>[]
): React.ReactElement {
  let wrapped = content;
  for (let i = layouts.length - 1; i >= 0; i--) {
    const Layout = layouts[i];
    if (Layout) {
      wrapped = <Layout>{wrapped}</Layout>;
    }
  }
  return wrapped;
}

/**
 * Client-side router component
 */
export function Router({
  routes,
  layouts,
  notFound,
  ssrPages = new Set(),
}: RouterProps) {
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  // Navigate function for programmatic navigation
  const navigateTo = (path: string) => {
    if (typeof window === "undefined") return;
    if (path !== currentPath) {
      window.history.pushState({}, "", path);
      setCurrentPath(path);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Scroll to top on navigation
    window.scrollTo(0, 0);

    // Handle popstate (back/forward buttons)
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);

    // Intercept link clicks for client-side navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest?.("a");

      if (
        link &&
        link.href &&
        link.href.startsWith(window.location.origin) &&
        !link.target &&
        !link.download &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const newPath = new URL(link.href).pathname;

        // Don't intercept API routes or socket routes - let browser make direct request
        if (newPath.startsWith("/api/") || newPath.startsWith("/sockets/")) {
          return; // Let browser handle the request directly
        }

        // Don't intercept navigation to SSR pages - let browser do full page load
        // so the server can render the page
        const isSSRPage = Array.from(ssrPages).some((ssrPath) => {
          // Convert route pattern [slug] to regex pattern
          const pattern = ssrPath.replace(/\[([^\]]+)\]/g, "[^/]+");
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(newPath);
        });

        if (isSSRPage) {
          return; // Let browser handle full page navigation
        }

        e.preventDefault();
        if (newPath !== currentPath) {
          window.history.pushState({}, "", link.href);
          setCurrentPath(newPath);
        }
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick);
    };
  }, [currentPath, ssrPages]);

  // Find matching route
  let matchedRoute: RouteConfig | null = null;
  let routeMatch: { params: Record<string, string> } | null = null;

  for (const route of routes) {
    const match = matchRoute(currentPath, route);
    if (match) {
      matchedRoute = route;
      routeMatch = match;
      break;
    }
  }

  // Get query parameters
  const query: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const searchParams = new URL(window.location.href).searchParams;
    searchParams.forEach((value, key) => {
      query[key] = value;
    });
  }

  // Context value for child components
  const contextValue: RouterContextValue = {
    pathname: currentPath,
    navigate: navigateTo,
    params: routeMatch?.params || {},
  };

  // Render content
  let content: React.ReactElement;

  if (!matchedRoute) {
    // Render 404 if no match
    const NotFoundComponent = notFound || DefaultNotFound;
    const applicableLayouts = getLayoutsForPath(currentPath, layouts);
    content = wrapWithLayouts(<NotFoundComponent />, applicableLayouts);
  } else {
    // Render matched route
    const PageComponent = matchedRoute.component;
    const pageProps = {
      params: routeMatch?.params || {},
      query,
    };

    const applicableLayouts = getLayoutsForPath(currentPath, layouts);
    content = wrapWithLayouts(
      <PageComponent {...pageProps} />,
      applicableLayouts
    );
  }

  return (
    <RouterContext.Provider value={contextValue}>
      {content}
    </RouterContext.Provider>
  );
}

/**
 * Default 404 component
 */
function DefaultNotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/">← Back to Home</a>
    </div>
  );
}

/**
 * Hook to access router state and navigation
 */
export function useRouter() {
  const context = useContext(RouterContext);

  // Try to get SSR context if client context is not available
  if (!context) {
    // During SSR, try to use SSR router context
    if (typeof window === "undefined" && SSRRouterContext) {
      const ssrContext = useContext(SSRRouterContext);
      if (ssrContext) {
        return {
          pathname: ssrContext.pathname,
          navigate: () => {},
          params: ssrContext.params,
        };
      }
    }

    // Fallback for cases where neither context is available
    if (typeof window === "undefined") {
      return {
        pathname: "/",
        navigate: () => {},
        params: {},
      };
    }

    throw new Error("useRouter must be used within a Router component");
  }
  return context;
}

/**
 * Hook to access route parameters
 * @example
 * // In /blog/[blogId]/page.tsx
 * const { blogId } = useParams();
 */
export function useParams(): Record<string, string> {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useParams must be used within a Router component");
  }
  return context.params;
}

/**
 * Navigate programmatically (for non-React contexts)
 */
export function navigate(path: string) {
  if (typeof window !== "undefined") {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
