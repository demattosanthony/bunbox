/**
 * Client-side router for BunBox
 * Automatically discovers routes from the app directory structure
 */

import React, { useEffect, useState } from "react";

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  pattern: RegExp;
  paramNames: string[];
}

export interface RouterProps {
  routes: RouteConfig[];
  layouts?: Map<string, React.ComponentType<{ children: React.ReactNode }>>;
  notFound?: React.ComponentType;
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
  const pathParts = pathname.split("/").filter(Boolean);

  // Check root layout
  const rootLayout = layouts.get("/");
  if (rootLayout) applicableLayouts.push(rootLayout);

  // Check nested layouts
  let currentPath = "";
  for (const part of pathParts) {
    currentPath += "/" + part;
    const layout = layouts.get(currentPath);
    if (layout) applicableLayouts.push(layout);
  }

  return applicableLayouts;
}

/**
 * Client-side router component
 */
export function Router({ routes, layouts, notFound }: RouterProps) {
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

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
        e.preventDefault();
        const newPath = new URL(link.href).pathname;
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
  }, [currentPath]);

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

  // Render 404 if no match
  if (!matchedRoute) {
    const NotFoundComponent = notFound || DefaultNotFound;
    const applicableLayouts = getLayoutsForPath(currentPath, layouts);

    let content = <NotFoundComponent />;

    // Wrap with layouts
    for (let i = applicableLayouts.length - 1; i >= 0; i--) {
      const Layout = applicableLayouts[i];
      if (Layout) {
        content = <Layout>{content}</Layout>;
      }
    }

    return content;
  }

  // Render matched route
  const PageComponent = matchedRoute.component;
  const pageProps = {
    params: routeMatch?.params || {},
    query,
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  const applicableLayouts = getLayoutsForPath(currentPath, layouts);

  let content = <PageComponent {...pageProps} />;

  // Wrap with layouts from innermost to outermost
  for (let i = applicableLayouts.length - 1; i >= 0; i--) {
    const Layout = applicableLayouts[i];
    if (Layout) {
      content = <Layout>{content}</Layout>;
    }
  }

  return content;
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
 * Navigate programmatically
 */
export function navigate(path: string) {
  if (typeof window !== "undefined") {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

/**
 * Link component for client-side navigation
 */
export function Link({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
