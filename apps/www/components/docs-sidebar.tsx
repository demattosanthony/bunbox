"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "@ademattos/bunbox/client";

interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: "Getting Started",
    href: "/docs/introduction",
    items: [
      { title: "Introduction", href: "/docs/introduction" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/quick-start" },
    ],
  },
  {
    title: "Core Concepts",
    href: "/docs/routing",
    items: [
      { title: "Routing", href: "/docs/routing" },
      { title: "Pages", href: "/docs/pages" },
      { title: "Layouts", href: "/docs/layouts" },
      { title: "Client-Side Routing", href: "/docs/client-routing" },
      { title: "Server Components", href: "/docs/server-components" },
    ],
  },
  {
    title: "API Routes",
    href: "/docs/api-routes",
    items: [
      { title: "API Routes", href: "/docs/api-routes" },
      { title: "API Client", href: "/docs/api-client" },
      { title: "Route Handlers", href: "/docs/route-handlers" },
      { title: "useQuery Hook", href: "/docs/usequery" },
      { title: "Middleware", href: "/docs/middleware" },
      { title: "Validation", href: "/docs/validation" },
      { title: "Streaming", href: "/docs/streaming" },
    ],
  },
  {
    title: "Real-time",
    href: "/docs/sockets",
    items: [
      { title: "Sockets", href: "/docs/sockets" },
      { title: "Socket Protocol", href: "/docs/socket-protocol" },
      { title: "WebSockets", href: "/docs/websockets" },
    ],
  },
  {
    title: "Advanced",
    href: "/docs/configuration",
    items: [
      { title: "Configuration", href: "/docs/configuration" },
      { title: "Deployment", href: "/docs/deployment" },
      { title: "Workers", href: "/docs/workers" },
    ],
  },
];

export function DocsSidebar() {
  const { pathname } = useRouter();

  return (
    <nav className="space-y-6">
      {navigation.map((section) => (
        <div key={section.title}>
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            {section.title}
          </h4>
          {section.items && (
            <ul className="space-y-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={cn(
                        "block text-sm transition-colors py-1 px-2 rounded-md",
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {item.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
