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

## Nginx Reverse Proxy

Configure Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL with Let's Encrypt

Add HTTPS with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Performance Tips

1. **Enable compression** - Nginx handles gzip automatically
2. **Use a CDN** - Serve static assets from a CDN
3. **Set caching headers** - Cache static assets aggressively
4. **Monitor performance** - Use tools like PM2 or systemd

## Health Checks

Add a health check endpoint:

```typescript
// app/api/health/route.ts
import { route } from "@ademattos/bunbox";

export const GET = route.handle(async () => {
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
