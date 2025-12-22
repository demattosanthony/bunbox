import type { BunboxConfig } from "@ademattos/bunbox";

const config: BunboxConfig = {
  port: 3002,
  hostname: "localhost",
  appDir: "./app",
  publicDir: "./public", // Static assets served at root (e.g., /robots.txt)
};

export default config;
