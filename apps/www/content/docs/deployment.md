---
title: Deployment
description: Deploy your Bunbox application to production
order: 15
category: Advanced
---

## Building for Production

Build your application:

```bash
bun run build
```

This creates an optimized production build.

## Starting in Production

Run the production server:

```bash
bun run start
```

## Environment Variables

Set production environment variables:

```bash
export NODE_ENV=production
export PORT=3000
export DATABASE_URL=your-production-db
```

Or use a `.env.production` file.

## Docker

Deploy with Docker:

```dockerfile
# Dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "start"]
```

Build and run:

```bash
docker build -t my-bunbox-app .
docker run -p 3000:3000 my-bunbox-app
```

## VPS Deployment

Deploy to a VPS:

1. Install Bun on your server:

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Clone your repository:

```bash
git clone https://github.com/yourusername/your-app.git
cd your-app
```

3. Install dependencies:

```bash
bun install
```

4. Build for production:

```bash
bun run build
```

5. Start with PM2:

```bash
npm install -g pm2
pm2 start "bun start" --name my-app
pm2 startup
pm2 save
```

## Caddy Reverse Proxy

Configure Caddy as a reverse proxy with automatic HTTPS:

1. Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. Create a Caddyfile (`/etc/caddy/Caddyfile`):

```caddy
yourdomain.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

3. Start and enable Caddy:

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
sudo caddy reload --config /etc/caddy/Caddyfile
```

Caddy automatically provisions and renews SSL certificates via Let's Encrypt - no additional configuration needed!

## Performance Tips

1. **Enable compression** - Caddy handles gzip automatically
2. **Use a CDN** - Serve static assets from a CDN
3. **Set caching headers** - Cache static assets aggressively
4. **Monitor performance** - Use tools like PM2 or systemd

## Health Checks

Add a health check endpoint:

```typescript
// app/api/health/route.ts
import { route } from "@ademattos/bunbox";

export const healthCheck = route.get().handle(async () => {
  return { status: "ok", timestamp: Date.now() };
});
```

## Logging

Add logging for production:

```typescript
// Middleware for logging
const logger = async (ctx) => {
  const start = Date.now();
  console.log(`${ctx.method} ${ctx.url}`);
  const result = await next(ctx);
  console.log(`${ctx.method} ${ctx.url} - ${Date.now() - start}ms`);
  return result;
};
```

## Monitoring

Monitor your application with:

- **PM2 monitoring**: `pm2 monit`
- **System metrics**: CPU, memory, disk usage
- **Application logs**: Error tracking and debugging
- **Uptime monitoring**: Services like UptimeRobot

## Zero-Downtime Deployment

Use PM2 for zero-downtime deployments:

```bash
pm2 reload my-app
```

This gracefully restarts your application without dropping connections.
