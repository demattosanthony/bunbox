# bunbox-deploy

Deploy Bunbox apps to VPS servers via SSH with automatic HTTPS setup.

## Features

- **One-command deployment** - Build locally, transfer, and start in one step
- **Zero-downtime** - PM2 process management with graceful reloads
- **Automatic HTTPS** - Caddy integration with Let's Encrypt
- **Rollback support** - Keep multiple releases for instant rollback
- **Simple config** - TypeScript config file with type safety

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

This will:

- Install Bun on the server (if not present)
- Install PM2 globally
- Install Caddy (if domain is configured)
- Create deployment directories

### 3. Deploy

```bash
bunx bunbox-deploy deploy production
```

This will:

1. Build your app locally (`bunbox build`)
2. Transfer files via rsync
3. Install dependencies on server
4. Update the symlink to the new release
5. Restart the app via PM2
6. Configure Caddy (if domain is set)
7. Run health check

## Commands

### `bunbox-deploy init`

Create a new `bunbox.deploy.ts` config file.

### `bunbox-deploy setup [target]`

Setup a server with Bun, PM2, and optionally Caddy.

### `bunbox-deploy deploy [target]`

Deploy the application to the target server.

Options:

- `--no-build` - Skip local build
- `--no-install` - Skip dependency installation
- `--no-restart` - Skip PM2 restart
- `--dry-run` - Preview without executing
- `-V, --verbose` - Verbose output

### `bunbox-deploy status [target]`

Show deployment status including:

- Current release
- PM2 process status
- Memory/CPU usage
- Recent releases

### `bunbox-deploy rollback [target]`

Rollback to the previous release.

### `bunbox-deploy logs [target]`

View application logs.

Options:

- `-f, --follow` - Stream logs in real-time

### `bunbox-deploy ssh [target]`

Open an SSH session to the server.

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
  env?: Record<string, string>; // Environment variables

  // HTTPS (optional)
  domain?: string; // Domain for Caddy auto-HTTPS

  // Options
  keepReleases?: number; // Releases to keep (default: 5)
  exclude?: string[]; // Files to exclude from transfer
}
```

## Server Directory Structure

After deployment, your server will have:

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

## DNS Configuration

When you configure a `domain` in your target, bunbox-deploy will:

1. Configure Caddy as a reverse proxy
2. Print DNS instructions:

```
DNS Configuration Required

Add this DNS record to your domain provider:

  Type:  A
  Name:  @ (or myapp)
  Value: 123.45.67.89

Caddy will automatically provision HTTPS via Let's Encrypt
once DNS propagates.

Your app will be live at: https://myapp.com
```

## Requirements

### Local Machine

- Bun
- rsync
- SSH key configured

### Server

- Ubuntu/Debian (for Caddy auto-install)
- SSH access with key authentication
- sudo access (for Caddy configuration)

## License

MIT
