import { defineConfig } from "@ademattos/bunbox";

export default defineConfig({
  port: 3001,
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
