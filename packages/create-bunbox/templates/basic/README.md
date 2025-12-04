# {{projectName}}

A [Bunbox](https://github.com/demattosanthony/bunbox) application.

## Getting Started

```bash
# Start development server
bun dev

# Build for production
bun build

# Start production server
bun start
```

## Project Structure

```
├── app/
│   ├── page.tsx          # Home page
│   ├── layout.tsx        # Root layout
│   ├── index.css         # Global styles
│   └── api/
│       └── health/
│           └── route.ts  # Health check endpoint
├── public/               # Static assets
├── bunbox.config.ts      # Bunbox configuration
└── package.json
```

## Learn More

- [Bunbox Documentation](https://github.com/demattosanthony/bunbox)
- [Bun Documentation](https://bun.sh/docs)
