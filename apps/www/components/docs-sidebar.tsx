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
      { title: "Rendering", href: "/docs/rendering" },
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
      { title: "Data Loading", href: "/docs/data-loading" },
      { title: "Page Middleware", href: "/docs/page-middleware" },
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
      { title: "OpenAPI & Swagger", href: "/docs/openapi" },
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
      { title: "Jobs", href: "/docs/jobs" },
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
                          ? "text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground"
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
