/**
 * Example scheduled job - runs every minute
 * Demonstrates interval-based scheduling
 */
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  interval: "1m", // Every minute
  async run() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[cleanup-logs] Running scheduled cleanup at ${timestamp}`);

    // Simulate cleanup work
    // In a real app, you might clean old log files, expired cache, etc.
  },
});
