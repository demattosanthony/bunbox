# Bunbox Website

The official marketing and documentation website for [Bunbox](https://github.com/demattosanthony/bunbox).

## About

This is the main website for Bunbox, featuring:

- **Marketing Homepage** - Introduction to Bunbox with features and quick start
- **Documentation** - Comprehensive guides and API reference
- **Blog** - Latest news, updates, and tutorials

Built with Bunbox itself and styled with Tailwind CSS v4.

## Development

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun build

# Start production server
bun start
```

The site will be available at `http://localhost:3001`.

## Project Structure

```
apps/www/
├── app/                    # Application routes
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root layout
│   ├── docs/              # Documentation pages
│   │   ├── layout.tsx
│   │   └── [slug]/page.tsx
│   └── blog/              # Blog pages
│       ├── page.tsx
│       └── [slug]/page.tsx
├── components/            # React components
│   ├── ui/               # UI components
│   ├── navigation.tsx
│   ├── footer.tsx
│   └── docs-sidebar.tsx
├── content/              # Markdown content
│   ├── docs/            # Documentation files
│   └── blog/            # Blog posts
├── lib/                 # Utilities
│   ├── utils.ts
│   └── docs.ts
└── public/              # Static assets
```

## Adding Documentation

Create a new markdown file in `content/docs/`:

```markdown
---
title: Your Doc Title
description: A short description
order: 1
category: Getting Started
---

# Your Content Here
```

The file will be automatically available at `/docs/filename` (without the `.md` extension).

## Adding Blog Posts

Create a new markdown file in `content/blog/`:

```markdown
---
title: Your Post Title
description: A short description
date: 2024-11-24
author: Your Name
published: true
---

# Your Post Content Here
```

The post will be automatically listed on the blog page and available at `/blog/filename`.

## License

MIT

