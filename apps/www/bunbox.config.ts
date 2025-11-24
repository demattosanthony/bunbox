import type { BunboxConfig } from "@ademattos/bunbox";

const config: BunboxConfig = {
  port: 3000,
  hostname: "localhost",
  appDir: "./app",
  socketsDir: "./app/sockets",
  publicDir: "./public", // Static assets served at root (e.g., /robots.txt)
};

export default config;
