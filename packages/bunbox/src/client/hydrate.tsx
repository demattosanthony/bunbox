/**
 * BunBox Client Hydration
 * This file is automatically included by BunBox and handles:
 * - Automatic route discovery from /app directory
 * - Client-side routing for non-SSR pages
 * - SSR pages: Server-only with optional client island hydration
 * - HMR support
 */

import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Router, createRoutePattern, type RouteConfig } from "./router";
import type { RouteModules, LayoutModules } from "../core/types";
import { countStaticSegments } from "../core/router";
import { getIslandRegistry } from "./island";

// Check if we have SSR content
declare global {
  interface Window {
    __BUNBOX_DATA__?: {
      params: Record<string, string>;
      query: Record<string, string>;
      pathname: string;
      ssr?: boolean;
    };
  }
}

/**
 * Hydrate client islands within SSR pages
 * Islands are marked with data-bunbox-island attribute
 */
function hydrateIslands() {
  const islands = document.querySelectorAll("[data-bunbox-island]");
  const registry = getIslandRegistry();

  islands.forEach((island) => {
    const componentName = island.getAttribute("data-island-component");
    const propsJson = island.getAttribute("data-island-props");

    if (!componentName) return;

    const Component = registry.get(componentName);
    if (!Component) {
      console.warn(`[Bunbox] Island component "${componentName}" not registered`);
      return;
    }

    try {
      const props = propsJson ? JSON.parse(propsJson) : {};
      hydrateRoot(island as HTMLElement, React.createElement(Component, props));
    } catch (error) {
      console.error(`[Bunbox] Failed to hydrate island "${componentName}":`, error);
    }
  });
}

/**
 * Set up navigation listeners for SSR pages
 * All navigation from SSR pages triggers full page load
 */
function setupSSRNavigation() {
  // Navigation is handled by browser - no interception needed
  // Links work naturally with full page loads
}

/**
 * Initialize the app with provided routes
 * SSR pages: Hydrate islands only, no full React tree
 * Client pages: Full React rendering
 */
export async function initBunbox(
  routeModules: RouteModules,
  layoutModules: LayoutModules,
  ssrPages: Set<string> = new Set()
) {
  const isCurrentPageSSR = window.__BUNBOX_DATA__?.ssr === true;

  // For SSR pages: Only hydrate client islands, not the full page
  if (isCurrentPageSSR) {
    setupSSRNavigation();
    hydrateIslands();
    return;
  }

  // For client-rendered pages: Run React normally
  const routes: RouteConfig[] = [];
  const layouts = new Map<
    string,
    React.ComponentType<{ children: React.ReactNode }>
  >();

  // Setup routes
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

  const App = () => (
    <Router routes={routes} layouts={layouts} ssrPages={ssrPages} />
  );

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error(
      "Root element not found. Make sure you have a <div id='root'></div> in your HTML."
    );
  }

  // HMR support
  if (import.meta.hot) {
    const root = (import.meta.hot.data.root ??= createRoot(rootElement));
    root.render(<App />);
  } else {
    createRoot(rootElement).render(<App />);
  }
}
