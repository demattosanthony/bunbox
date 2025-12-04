import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturesGrid } from "@/components/features-grid";
import { useState } from "react";

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  return (
    <div className="relative overflow-hidden">
      {/* Extended Grid Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/5 opacity-20 blur-[100px]"></div>
      </div>

      {/* Hero Section */}
      <div className="relative isolate pt-14">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl mb-8 text-foreground leading-[1.1]">
              The React Framework for Bun
            </h1>

            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Bunbox makes building full-stack React applications ridiculously
              simple. File-based routing, server components, API routes, and
              WebSockets—all powered by Bun's blazing speed.
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                asChild
              >
                <a href="/docs/introduction">Get Started</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold bg-background hover:bg-muted/50 border-border/50 shadow-sm hover:shadow transition-all duration-300"
                asChild
              >
                <a href="/docs/introduction">Learn Bunbox</a>
              </Button>
            </div>

            <div className="mt-10 flex items-center justify-center gap-x-4 text-sm font-mono text-muted-foreground bg-muted/30 px-4 py-2.5 rounded-lg border border-border/40 w-fit mx-auto backdrop-blur-sm">
              <span>📦 ~ bunx create-bunbox my-app</span>
              <button
                className="hover:text-foreground transition-all duration-300"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid (Replacing Code Preview and old Features) */}
      <FeaturesGrid />
    </div>
  );
}
