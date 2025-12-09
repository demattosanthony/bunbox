---
title: Deployment
description: Deploy your Bunbox application to production
order: 15
category: Advanced
---

The easiest way to deploy a Bunbox app is with `bunbox-deploy` - a CLI tool that handles building, transferring, and starting your app on a VPS with automatic HTTPS.

## Installation

```bash
bun add -D bunbox-deploy
```

## Quick Start

### 1. Initialize configuration

```bash
bunx bunbox-deploy init
```

This creates `bunbox.deploy.ts`:

```typescript
import { defineDeployConfig } from "bunbox-deploy";

export default defineDeployConfig({
  targets: {
    production: {
      host: "your-server.com",
      username: "deploy",
      privateKey: "~/.ssh/id_ed25519",
      deployPath: "/var/www/myapp",
      name: "myapp",
      port: 3000,

      // Optional: Enable automatic HTTPS
      domain: "myapp.com",

      env: {
        NODE_ENV: "production",
        DATABASE_URL: "${DATABASE_URL}", // Uses local env var
      },
    },
  },
});
```

### 2. Setup the server

```bash
bunx bunbox-deploy setup production
```

This automatically installs Bun, PM2, and Caddy (if domain is configured) on your server.

### 3. Deploy

```bash
bunx bunbox-deploy deploy production
```

That's it! Your app is live with automatic HTTPS.

## What happens during deploy

1. Builds your app locally (`bunbox build`)
2. Transfers files via rsync
3. Installs dependencies on server
4. Updates the symlink to the new release
5. Restarts the app via PM2
6. Configures Caddy reverse proxy (if domain is set)
7. Runs health check

## Commands

| Command                           | Description                       |
| --------------------------------- | --------------------------------- |
| `bunbox-deploy init`              | Create config file                |
| `bunbox-deploy setup [target]`    | Setup server with Bun, PM2, Caddy |
| `bunbox-deploy deploy [target]`   | Deploy to target                  |
| `bunbox-deploy status [target]`   | Show deployment status            |
| `bunbox-deploy rollback [target]` | Rollback to previous release      |
| `bunbox-deploy logs [target]`     | View application logs             |
| `bunbox-deploy ssh [target]`      | Open SSH session                  |

### Deploy options

```bash
bunx bunbox-deploy deploy production --no-build    # Skip local build
bunx bunbox-deploy deploy production --no-install  # Skip dependency install
bunx bunbox-deploy deploy production --dry-run     # Preview without executing
bunx bunbox-deploy deploy production -V            # Verbose output
```

## Configuration Options

```typescript
interface DeployTarget {
  // SSH Connection
  host: string; // Server hostname or IP
  sshPort?: number; // SSH port (default: 22)
  username: string; // SSH username
  privateKey: string; // Path to SSH private key

  // Deployment
  deployPath: string; // Where to deploy (e.g., /var/www/myapp)
  name: string; // PM2 process name

  // Application
  port?: number; // App port (default: 3000)
  script?: string; // Script to run (default: "start")
  env?: Record<string, string>; // Environment variables

  // HTTPS
  domain?: string; // Domain for Caddy auto-HTTPS

  // Options
  keepReleases?: number; // Releases to keep (default: 5)
  exclude?: string[]; // Files to exclude from transfer
}
```

## Git Deployment

Instead of rsync, you can deploy by cloning from a git repository:

```typescript
export default defineDeployConfig({
  targets: {
    production: {
      // ... other config
      git: {
        repo: "https://github.com/user/myapp.git",
        branch: "main",
        token: "${GITHUB_TOKEN}", // For private repos
      },
    },
  },
});
```

Test your git setup:

```bash
bunx bunbox-deploy setup-git production
```

## Server Directory Structure

After deployment:

```
/var/www/myapp/
├── current -> releases/20241203_143022/  # Symlink to active release
├── releases/
│   ├── 20241203_143022/                  # Current release
│   └── 20241203_120000/                  # Previous (for rollback)
├── shared/
│   └── .env                              # Shared environment file
├── logs/
│   ├── output.log
│   └── error.log
└── ecosystem.config.js                   # PM2 configuration
```

## Requirements

**Local machine:**

- Bun
- rsync
- SSH key configured

**Server:**

- Ubuntu/Debian (for auto-install)
- SSH access with key authentication
- sudo access (for Caddy)

## Alternative: Docker

If you prefer Docker:

```dockerfile
FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "start"]
```

```bash
docker build -t my-bunbox-app .
docker run -p 3000:3000 my-bunbox-app
```

## Health Checks

Add a health check endpoint for monitoring:

```typescript
// app/api/health/route.ts
import { route } from "@ademattos/bunbox";

export const healthCheck = route.get().handle(async () => {
  return { status: "ok", timestamp: Date.now() };
});
```
