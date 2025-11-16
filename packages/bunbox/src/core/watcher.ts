/**
 * File watcher for development hot reload
 */

import { watch, type FSWatcher } from "fs";

export interface WatcherConfig {
  rootDir: string;
  onChange: () => void;
}

const IGNORE_PATTERNS = {
  dirs: [
    "node_modules",
    ".git",
    ".bunbox",
    "public",
    "dist",
    "build",
    ".next",
    ".cache",
    ".turbo",
    "coverage",
  ],
  extensions: [".log", ".lock", ".tmp", ".temp", ".swp", ".swo", "~"],
  prefixes: [".#", "#", "4913"],
};

function shouldIgnore(path: string): boolean {
  if (!path) return true;

  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const filename = parts[parts.length - 1];

  return (
    parts.some((part) => IGNORE_PATTERNS.dirs.includes(part)) ||
    IGNORE_PATTERNS.extensions.some((ext) => filename?.endsWith(ext)) ||
    IGNORE_PATTERNS.prefixes.some(
      (prefix) => filename?.startsWith(prefix) || filename?.endsWith(prefix)
    )
  );
}

export function createWatcher(config: WatcherConfig) {
  let watcher: FSWatcher | null = null;
  let debounceTimer: Timer | null = null;
  let lastReload = 0;

  const triggerChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const now = Date.now();
      if (now - lastReload >= 1000) {
        lastReload = now;
        config.onChange();
      }
    }, 100);
  };

  try {
    watcher = watch(config.rootDir, { recursive: true }, (_, filename) => {
      if (filename && !shouldIgnore(filename)) triggerChange();
    });
  } catch (error) {
    console.warn("Failed to create file watcher:", error);
  }

  return {
    close: () => {
      if (watcher) watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}
