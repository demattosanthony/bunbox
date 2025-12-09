---
title: Layouts
description: Layouts allow you to share UI between multiple pages. They wrap page content and can be nested for complex layouts.
order: 6
category: Core Concepts
---

## Root Layout

Every app should have a root layout:

```tsx
// app/layout.tsx
import type { PageMetadata } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "My App",
  description: "Welcome to my app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>
        <nav>{/* Navigation */}</nav>
      </header>
      <main>{children}</main>
      <footer>{/* Footer */}</footer>
    </div>
  );
}
```

## Nested Layouts

Create layouts for specific sections:

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <aside>{/* Dashboard sidebar */}</aside>
      <main>{children}</main>
    </div>
  );
}
```

This layout applies to all pages under `/dashboard/*`.

## Layout Hierarchy

Layouts are nested from root to leaf:

```
app/
├── layout.tsx              (Root layout)
└── dashboard/
    ├── layout.tsx          (Dashboard layout)
    └── settings/
        ├── layout.tsx      (Settings layout)
        └── page.tsx        (Settings page)
```

The settings page will be wrapped by all three layouts.

## Interactive Layouts

Layouts are fully hydrated and support React hooks:

```tsx
// app/layout.tsx
import { useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      <header>
        <button onClick={() => setMenuOpen(!menuOpen)}>
          Toggle Menu
        </button>
        {menuOpen && <nav>{/* Navigation */}</nav>}
      </header>
      <main>{children}</main>
    </div>
  );
}
```

## Preserving State

Layouts preserve state across navigation. Use them for:

- Navigation bars
- Sidebars
- User authentication status
- Shopping cart state
- Any UI that should persist

## Layout Metadata

Layouts can export metadata:

```tsx
import type { PageMetadata } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "Dashboard",
  description: "User dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
```

Page metadata takes precedence over layout metadata.

## Loading States in Layouts

Show loading indicators during navigation:

```tsx
import { useRouter } from "@ademattos/bunbox/client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isNavigating } = useRouter();

  return (
    <div>
      {isNavigating && <div className="loading-indicator" />}
      <main>{children}</main>
    </div>
  );
}
```
