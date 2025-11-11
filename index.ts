import { createServer } from "./src/index";

// Start the Bunbox server
await createServer({
  port: 3000,
  development: true,
});
