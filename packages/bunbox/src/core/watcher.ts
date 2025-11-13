/**
 * File watcher for development hot reload
 */

import { watch, type FSWatcher } from "fs";

export interface WatcherConfig {
  appDir: string;
  wsDir: string;
  socketsDir: string;
  onChange: () => void;
}

/**
 * Watch directories for changes and trigger reload
 */
export function createWatcher(config: WatcherConfig) {
  const watchers: FSWatcher[] = [];

  // Debounce changes to avoid multiple rapid reloads
  let debounceTimer: Timer | null = null;
  const triggerChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      config.onChange();
    }, 100);
  };

  // Watch app directory
  try {
    const appWatcher = watch(
      config.appDir,
      { recursive: true },
      (eventType, filename) => {
        if (filename && !filename.includes(".bunbox")) {
          triggerChange();
        }
      }
    );
    watchers.push(appWatcher);
  } catch (error) {
    // Silently continue if can't watch
  }

  // Watch ws directory if it exists
  try {
    const wsWatcher = watch(
      config.wsDir,
      { recursive: true },
      (eventType, filename) => {
        if (filename) {
          triggerChange();
        }
      }
    );
    watchers.push(wsWatcher);
  } catch (error) {
    // ws directory might not exist, that's okay
  }

  // Watch sockets directory if it exists
  try {
    const socketsWatcher = watch(
      config.socketsDir,
      { recursive: true },
      (eventType, filename) => {
        if (filename) {
          triggerChange();
        }
      }
    );
    watchers.push(socketsWatcher);
  } catch (error) {
    // sockets directory might not exist, that's okay
  }

  return {
    close: () => {
      watchers.forEach((w) => w.close());
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}
