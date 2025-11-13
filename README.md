# 📦 Bunbox

A minimal full-stack framework for Bun. Create files in `app/` and they become routes - pages, APIs, socket servers, and workers.

## 🚀 Quick Start

```bash
bun add @ademattos/bunbox
```

Create your first page:

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello World</h1>;
}
```

Start the dev server:

```bash
bunbox dev
```

Visit `http://localhost:3000`

## Documentation

See [packages/bunbox/README.md](./packages/bunbox/README.md) for complete documentation.

## Examples

```bash
cd examples/basic
bun dev
```

## License

MIT
