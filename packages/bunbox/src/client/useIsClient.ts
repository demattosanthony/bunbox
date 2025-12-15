/**
 * useIsClient - Detect if code is running on the client
 *
 * Uses React's `useSyncExternalStore` to safely handle SSR/hydration.
 * Returns `false` during SSR and `true` on the client after hydration.
 *
 * This is the official React pattern for handling client-only code without
 * hydration mismatch warnings.
 *
 * @example
 * ```tsx
 * import { useIsClient } from "@ademattos/bunbox/client";
 *
 * function BrowserOnlyComponent() {
 *   const isClient = useIsClient();
 *
 *   if (!isClient) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   // Safe to use browser APIs here
 *   return <div>Window width: {window.innerWidth}px</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With Three.js
 * import { useIsClient } from "@ademattos/bunbox/client";
 * import * as THREE from "three";
 *
 * function ThreeScene() {
 *   const isClient = useIsClient();
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *
 *   useEffect(() => {
 *     if (!canvasRef.current) return;
 *
 *     const scene = new THREE.Scene();
 *     const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
 *     // ... Three.js setup
 *
 *     return () => renderer.dispose();
 *   }, []);
 *
 *   if (!isClient) {
 *     return <div>Loading 3D scene...</div>;
 *   }
 *
 *   return <canvas ref={canvasRef} />;
 * }
 * ```
 */

import { useSyncExternalStore } from "react";

/**
 * Hook that returns true if code is running on the client, false during SSR.
 *
 * Uses `useSyncExternalStore` to avoid hydration mismatch warnings.
 *
 * @returns `true` on the client after hydration, `false` during SSR
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    // subscribe: no-op function since we're not subscribing to anything
    () => () => {},
    // getSnapshot: client-side value
    () => true,
    // getServerSnapshot: server-side value
    () => false
  );
}
