/**
 * BunBox Client Hydration
 * This file is automatically included by BunBox and handles:
 * - Automatic route discovery from /app directory
 * - Client-side routing with loader support
 * - Full React tree hydration
 * - HMR support
 */

import React from "react";
import { hydrateRoot } from "react-dom/client";
import { Router, createRoutePattern, type RouteConfig } from "./router";
import type { RouteModules, LayoutModules } from "../core/types";
import { countStaticSegments } from "../core/router";

// Check if we have SSR content
declare global {
  interface Window {
    __BUNBOX_DATA__?: {
      params: Record<string, string>;
      query: Record<string, string>;
      pathname: string;
      loaderData?: unknown;
    };
  }
}

/**
 * Initialize the app with provided routes
 * Hydrates the full React tree with server-rendered content
 */
export async function initBunbox(
  routeModules: RouteModules,
  layoutModules: LayoutModules
) {
  // Setup routes
  const routes: RouteConfig[] = [];
  const layouts = new Map<
    string,
    React.ComponentType<{ children: React.ReactNode }>
  >();

  for (const [routePath, component] of Object.entries(routeModules)) {
    const { pattern, paramNames } = createRoutePattern(routePath);
    routes.push({
      path: routePath,
      component,
      pattern,
      paramNames,
    });
  }

  // Setup layouts
  for (const [routePath, component] of Object.entries(layoutModules)) {
    layouts.set(routePath, component);
  }

  // Sort routes by specificity (more specific first)
  routes.sort((a, b) => {
    const aStatic = countStaticSegments(a.path);
    const bStatic = countStaticSegments(b.path);

    if (aStatic !== bStatic) {
      return bStatic - aStatic;
    }

    return a.path.length - b.path.length;
  });

  // Get initial loader data from server
  const initialLoaderData = window.__BUNBOX_DATA__?.loaderData;

  const App = () => (
    <Router routes={routes} layouts={layouts} initialLoaderData={initialLoaderData} />
  );

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error(
      "Root element not found. Make sure you have a <div id='root'></div> in your HTML."
    );
  }

  // Hydrate the server-rendered content (HMR uses stable root reference)
  if (import.meta.hot) {
    import.meta.hot.data.root ??= hydrateRoot(rootElement, <App />);
  } else {
    hydrateRoot(rootElement, <App />);
  }
}
