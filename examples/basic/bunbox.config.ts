/**
 * Optional Bunbox configuration
 * All fields are optional and have sensible defaults
 */

import type { BunboxConfig } from "@ademattos/bunbox";

const config: BunboxConfig = {
  port: 3000,
  hostname: "localhost",
  appDir: "./app",
  publicDir: "./public", // Static assets served at root (e.g., /robots.txt)
  openapi: {
    enabled: true,
    title: "Bunbox Basic Example API",
    version: "1.0.0",
  },
};

export default config;
