/**
 * BunBox Client Hydration
 * This file is automatically included by BunBox and handles:
 * - Automatic route discovery from /app directory
 * - Client-side routing
 * - HMR support
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { Router, createRoutePattern, type RouteConfig } from "./router";

// Import routes from generated file (created by server)
// @ts-ignore - This file is generated at runtime
import {
  routes as routeModules,
  layouts as layoutModules,
} from "../../.bunbox/routes.ts";

/**
 * Initialize the app
 */
async function init() {
  const routes: RouteConfig[] = [];
  const layouts = new Map<
    string,
    React.ComponentType<{ children: React.ReactNode }>
  >();

  // Setup routes
  for (const [routePath, component] of Object.entries(
    routeModules as Record<string, React.ComponentType<any>>
  )) {
    const { pattern, paramNames } = createRoutePattern(routePath);
    routes.push({
      path: routePath,
      component,
      pattern,
      paramNames,
    });
  }

  // Setup layouts
  for (const [routePath, component] of Object.entries(
    layoutModules as Record<
      string,
      React.ComponentType<{ children: React.ReactNode }>
    >
  )) {
    layouts.set(routePath, component);
  }

  // Sort routes by specificity (more specific first)
  routes.sort((a, b) => {
    const aStatic = a.path.split("/").filter((s) => !s.startsWith("[")).length;
    const bStatic = b.path.split("/").filter((s) => !s.startsWith("[")).length;

    if (aStatic !== bStatic) {
      return bStatic - aStatic;
    }

    return a.path.length - b.path.length;
  });

  console.log(
    "🎨 BunBox Routes:",
    routes.map((r) => r.path)
  );
  console.log("📐 BunBox Layouts:", Array.from(layouts.keys()));

  const App = () => <Router routes={routes} layouts={layouts} />;

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

// Start the app
init().catch((error) => {
  console.error("Failed to initialize BunBox app:", error);
});
