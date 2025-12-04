/**
 * Client Island - Enables client components within server-rendered pages
 *
 * Usage:
 * ```tsx
 * "use server";
 * import { ClientIsland } from "@ademattos/bunbox";
 * import { Counter } from "./Counter"; // has "use client"
 *
 * export default function Page() {
 *   return (
 *     <div>
 *       <h1>Server rendered</h1>
 *       <ClientIsland component={Counter} props={{ initial: 0 }} />
 *     </div>
 *   );
 * }
 * ```
 */

import React, { useId } from "react";

export interface ClientIslandProps<P extends object> {
  /** The client component to render */
  component: React.ComponentType<P>;
  /** Props to pass to the component */
  props?: P;
  /** Fallback content while loading (optional) */
  fallback?: React.ReactNode;
}

/**
 * Wrapper for client components within server-rendered pages
 * Renders the component on server with hydration markers
 * Client-side script will hydrate these islands
 */
export function ClientIsland<P extends object>({
  component: Component,
  props = {} as P,
  fallback,
}: ClientIslandProps<P>) {
  const id = useId();
  const isServer = typeof window === "undefined";

  // Serialize props for hydration (must be JSON-serializable)
  const serializedProps = JSON.stringify(props);

  if (isServer) {
    // Server: Render with hydration marker
    return (
      <div
        data-bunbox-island={id}
        data-island-props={serializedProps}
        data-island-component={Component.displayName || Component.name || "Anonymous"}
      >
        <Component {...props} />
      </div>
    );
  }

  // Client: This shouldn't render (hydration handles it)
  // But fallback for edge cases
  return (
    <div data-bunbox-island={id}>
      {fallback || <Component {...props} />}
    </div>
  );
}

// Store for registered island components
const islandRegistry = new Map<string, React.ComponentType<any>>();

/**
 * Register a client component for island hydration
 * Call this in your client component file
 */
export function registerIsland(name: string, component: React.ComponentType<any>) {
  islandRegistry.set(name, component);
}

/**
 * Get a registered island component
 */
export function getIsland(name: string): React.ComponentType<any> | undefined {
  return islandRegistry.get(name);
}

/**
 * Get all registered islands
 */
export function getIslandRegistry(): Map<string, React.ComponentType<any>> {
  return islandRegistry;
}
