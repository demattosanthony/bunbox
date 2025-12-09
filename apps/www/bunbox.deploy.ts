import { defineDeployConfig } from "bunbox-deploy";

export default defineDeployConfig({
  // Default target when none specified
  defaultTarget: "production",

  targets: {
    production: {
      // SSH connection
      host: "138.197.33.89",
      username: "root",
      privateKey: "~/.ssh/id_rsa",

      // Where to deploy on the server
      deployPath: "/srv/bunbox-www",

      // PM2 process name
      name: "bunbox-www",

      // App port (default: 3000)
      port: 3002,

      // Domain for automatic HTTPS via Caddy (optional)
      domain: "bunbox.org",

      // Number of releases to keep for rollback (default: 5)
      keepReleases: 2,
    },
  },
});
