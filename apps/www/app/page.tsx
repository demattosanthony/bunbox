import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturesGrid } from "@/components/features-grid";

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <div className="relative isolate pt-14">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Headline with mixed typography */}
            <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl text-foreground leading-[1.1]">
              <span className="italic font-serif">Build full-stack</span> React
              apps <span className="italic font-serif">without</span> the
              complexity
            </h1>

            <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Create production-ready React applications with file-based
              routing, server components, and API routes. All powered by Bun's
              blazing speed.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex items-center justify-center gap-x-4">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-medium"
                asChild
              >
                <a href="/docs/introduction">Quick start</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base font-medium"
                asChild
              >
                <a
                  href="https://github.com/demattosanthony/bunbox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </div>

          {/* Terminal Code Block */}
          <div className="mt-16 mx-auto max-w-3xl">
            <div className="rounded-xl bg-zinc-900 shadow-2xl overflow-hidden">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>

              {/* Terminal Content */}
              <div className="p-6 font-mono text-sm leading-relaxed">
                <div className="text-zinc-500"># Create a new Bunbox app</div>
                <div className="mt-1">
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-white">bun create bunbox my-app</span>
                </div>

                <div className="mt-4 text-zinc-500"># Start the dev server</div>
                <div className="mt-1">
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-white">cd my-app && bun dev</span>
                </div>
                <div className="mt-1">
                  <span className="text-cyan-400">Ready</span>{" "}
                  <span className="text-zinc-400">
                    in <span className="text-white">4ms</span> at{" "}
                    <span className="text-blue-400 underline">
                      http://localhost:3000
                    </span>
                  </span>
                </div>

                <div className="mt-4 text-zinc-500"># Deploy to production</div>
                <div className="mt-1">
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-white">bun run build && bun start</span>
                </div>
                <div className="mt-1">
                  <span className="text-cyan-400">Server</span>{" "}
                  <span className="text-zinc-400">
                    running at{" "}
                    <span className="text-blue-400 underline">
                      https://my-app.com
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <FeaturesGrid />
    </div>
  );
}
