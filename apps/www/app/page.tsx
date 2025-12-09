import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturesGrid } from "@/components/features-grid";
import { TypingTerminal } from "@/components/typing-terminal";

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <div className="relative isolate sm:pt-14">
        {/* Background Grid */}
        <div
          className="absolute inset-0 bg-grid-pattern bg-grid-fade pointer-events-none"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Headline with mixed typography */}
            <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl text-foreground leading-[1.1]">
              <span className="italic font-serif">Build full-stack</span> React
              apps <span className="italic font-serif">without</span> the
              complexity
            </h1>

            <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Create production-ready React applications with file-based
              routing, server-side rendering, and API routes. All powered by
              Bun's blazing speed.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex items-center justify-center gap-x-4">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                asChild
              >
                <a href="/docs/introduction">Quick start</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base font-medium transition-all duration-200 hover:scale-[1.02]"
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
            <TypingTerminal />
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <FeaturesGrid />
    </div>
  );
}
