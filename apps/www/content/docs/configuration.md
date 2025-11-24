---
title: Configuration
description: Configure your Bunbox application
order: 13
category: Advanced
---

## Basic Configuration

Create `bunbox.config.ts` in your project root:

```typescript
import { defineConfig } from "@ademattos/bunbox";

export default defineConfig({
  port: 3000,
  appDir: "./app",
  publicDir: "./public",
});
```

## Configuration Options

### port

The port to run the server on.

- Type: `number`
- Default: `3000`

```typescript
export default defineConfig({
  port: 8080,
});
```

### appDir

The directory containing your application code.

- Type: `string`
- Default: `"./app"`

```typescript
export default defineConfig({
  appDir: "./src/app",
});
```

### publicDir

The directory containing static files.

- Type: `string`
- Default: `"./public"`

```typescript
export default defineConfig({
  publicDir: "./static",
});
```

### development

Enable development mode with hot reload.

- Type: `boolean`
- Default: `true` in dev, `false` in production

This is automatically set based on the command you run (`bun dev` vs `bun start`).

## Environment Variables

Use `.env` files for environment-specific configuration:

```bash
# .env
DATABASE_URL=postgresql://localhost/mydb
API_KEY=your-secret-key
```

Access in your code:

```typescript
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

## TypeScript Configuration

Customize TypeScript with `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "esnext",
    "target": "esnext",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Build Configuration

For production builds, Bunbox automatically:

- Minifies JavaScript
- Optimizes React
- Bundles dependencies
- Generates source maps

No additional configuration needed!
