import { Github } from "lucide-react";
import { Button } from "./ui/button";

const navLinks = [
  { name: "Docs", href: "/docs/introduction" },
  {
    name: "Examples",
    href: "https://github.com/demattosanthony/bunbox/tree/main/examples",
    external: true,
  },
];

export function Navigation() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex lg:flex-1">
          <a
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="text-2xl transition-transform duration-200 group-hover:rotate-12">
              📦
            </span>
            <span className="text-xl font-semibold text-foreground">
              Bunbox
            </span>
          </a>
        </div>

        {/* Center Nav Links */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navLinks.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Right Side */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 items-center">
          <a
            href="https://github.com/demattosanthony/bunbox"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span>GitHub</span>
          </a>
          <Button asChild>
            <a href="/docs/introduction">Get Started</a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
