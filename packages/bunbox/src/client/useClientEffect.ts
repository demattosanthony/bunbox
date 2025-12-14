/**
 * useClientEffect - useEffect that only runs on the client
 *
 * A convenience wrapper around `useEffect` that adds a client-only check,
 * preventing the effect from attempting to run during SSR.
 *
 * Use this when you need to access browser-only APIs like `window`, `document`,
 * `localStorage`, WebGL, etc.
 *
 * @example
 * ```tsx
 * import { useClientEffect } from "@ademattos/bunbox";
 * import * as THREE from "three";
 *
 * function ThreeScene() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *
 *   useClientEffect(() => {
 *     // No need for typeof window checks!
 *     const scene = new THREE.Scene();
 *     const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
 *     const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
 *
 *     // ... Three.js setup
 *
 *     const animate = () => {
 *       requestAnimationFrame(animate);
 *       renderer.render(scene, camera);
 *     };
 *     animate();
 *
 *     return () => {
 *       renderer.dispose();
 *     };
 *   }, []);
 *
 *   return <canvas ref={canvasRef} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With localStorage
 * import { useClientEffect } from "@ademattos/bunbox";
 *
 * function useLocalStorage(key: string, initialValue: string) {
 *   const [value, setValue] = useState(initialValue);
 *
 *   useClientEffect(() => {
 *     const stored = localStorage.getItem(key);
 *     if (stored) setValue(stored);
 *   }, [key]);
 *
 *   useClientEffect(() => {
 *     localStorage.setItem(key, value);
 *   }, [key, value]);
 *
 *   return [value, setValue];
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With event listeners
 * import { useClientEffect } from "@ademattos/bunbox";
 *
 * function useWindowSize() {
 *   const [size, setSize] = useState({ width: 0, height: 0 });
 *
 *   useClientEffect(() => {
 *     const handleResize = () => {
 *       setSize({ width: window.innerWidth, height: window.innerHeight });
 *     };
 *
 *     handleResize();
 *     window.addEventListener("resize", handleResize);
 *     return () => window.removeEventListener("resize", handleResize);
 *   }, []);
 *
 *   return size;
 * }
 * ```
 */

import { useEffect, type DependencyList, type EffectCallback } from "react";

/**
 * A version of useEffect that only runs on the client.
 *
 * This prevents effects from attempting to run during server-side rendering,
 * making it safe to use browser-only APIs without additional checks.
 *
 * @param effect - The effect callback function
 * @param deps - Optional dependency array
 */
export function useClientEffect(
  effect: EffectCallback,
  deps?: DependencyList
): void {
  useEffect(() => {
    // Safety check: only run on client
    if (typeof window === "undefined") return;

    // Run the effect
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
