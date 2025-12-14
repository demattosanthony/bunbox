import type { BunboxConfig } from "@ademattos/bunbox";

const config: BunboxConfig = {
  port: 3001,
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
};

export default config;
