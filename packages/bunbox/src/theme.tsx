/**
 * Bunbox Theme System
 *
 * Zero-config, flash-free dark mode for Bunbox apps.
 * Bunbox automatically injects a blocking script to prevent theme flash.
 *
 * Usage:
 * ```tsx
 * // In layout.tsx - just wrap with ThemeProvider
 * import { ThemeProvider } from "@ademattos/bunbox/theme";
 *
 * export default function Layout({ children }) {
 *   return <ThemeProvider>{children}</ThemeProvider>;
 * }
 *
 * // In any component
 * import { useTheme } from "@ademattos/bunbox/theme";
 *
 * function ThemeToggle() {
 *   const { resolvedTheme, setTheme } = useTheme();
 *   return <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle</button>;
 * }
 * ```
 */

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme when no preference is stored. Defaults to "system" */
  defaultTheme?: Theme;
  /** localStorage key for persisting theme. Defaults to "bunbox-theme" */
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

const DEFAULT_STORAGE_KEY = "bunbox-theme";
const DEFAULT_THEME: Theme = "system";

/**
 * Theme provider component. Wrap your layout with this.
 */
export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = DEFAULT_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    setResolvedTheme(resolved);

    // Only update if different (blocking script may have already set it)
    if (!root.classList.contains(resolved)) {
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      setResolvedTheme(newTheme);
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access and control the current theme.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
