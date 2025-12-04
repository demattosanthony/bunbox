# {{projectName}}

A [Bunbox](https://github.com/demattosanthony/bunbox) application with Tailwind CSS and shadcn/ui.

## Getting Started

```bash
# Start development server
bun dev

# Build for production
bun build

# Start production server
bun start
```

## Adding Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components. To add more components:

```bash
bunx shadcn@latest add [component-name]
```

For example:
```bash
bunx shadcn@latest add dialog
bunx shadcn@latest add dropdown-menu
```

## Project Structure

```
├── app/
│   ├── page.tsx          # Home page
│   ├── layout.tsx        # Root layout
│   └── index.css         # Tailwind CSS styles
├── components/
│   └── ui/               # shadcn/ui components
├── lib/
│   └── utils.ts          # Utility functions (cn)
├── public/               # Static assets
├── bunbox.config.ts      # Bunbox configuration
├── bunfig.toml           # Bun configuration (Tailwind plugin)
├── components.json       # shadcn/ui configuration
└── package.json
```

## Learn More

- [Bunbox Documentation](https://github.com/demattosanthony/bunbox)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
