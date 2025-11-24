import { Button } from "./ui/button";

const navigation = [
  { name: "Docs", href: "/docs/introduction" },
  {
    name: "Examples",
    href: "https://github.com/demattosanthony/bunbox/tree/main/examples",
    external: true,
  },
  {
    name: "GitHub",
    href: "https://github.com/demattosanthony/bunbox",
    external: true,
  },
];

export function Navigation() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between p-5 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <a
            href="/"
            className="-m-1.5 p-1.5 flex items-center gap-2 transition-all duration-200 ease-out hover:opacity-80 hover:scale-105 active:scale-95"
          >
            <span className="text-2xl transition-transform duration-200 group-hover:rotate-12">
              📦
            </span>
            <span className="text-xl font-semibold text-foreground">
              Bunbox
            </span>
          </a>
        </div>
        <div className="hidden lg:flex lg:gap-x-8 items-center">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 ease-out group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-foreground transition-all duration-300 ease-out group-hover:w-full" />
            </a>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 items-center">
          <a
            href="/docs/introduction"
            className="transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
          >
            <Button className="shadow-sm hover:shadow-md transition-shadow duration-200">
              Learn
            </Button>
          </a>
        </div>
      </nav>
    </header>
  );
}
