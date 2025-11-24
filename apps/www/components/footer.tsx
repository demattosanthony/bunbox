import { Github } from "lucide-react";

const footerLinks = {
  resources: [
    { name: "Documentation", href: "/docs/introduction" },
    {
      name: "Examples",
      href: "https://github.com/demattosanthony/bunbox/tree/main/examples",
    },
  ],
  community: [
    { name: "GitHub", href: "https://github.com/demattosanthony/bunbox" },
    {
      name: "Issues",
      href: "https://github.com/demattosanthony/bunbox/issues",
    },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <a href="/" className="flex items-center space-x-2">
              <span className="text-2xl">📦</span>
              <span className="text-xl font-bold text-foreground">Bunbox</span>
            </a>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              A simple full-stack framework built on Bun. 100x simpler than
              Next.js.
            </p>
            <div className="mt-6 flex space-x-4">
              <a
                href="https://github.com/demattosanthony/bunbox"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Community</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border/40 pt-8">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Bunbox. All rights reserved. Built
            with Bunbox.
          </p>
        </div>
      </div>
    </footer>
  );
}
