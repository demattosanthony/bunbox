import { ArrowRight } from "lucide-react";

export function FeaturesGrid() {
  return (
    <div className="py-24 sm:py-32 border-border/40">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-16">
        <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
          Everything you need,{" "}
          <span className="text-muted-foreground">nothing you don't.</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A complete full-stack framework. Type-safe from database to browser.
        </p>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Bun Speed */}
          <a
            href="/docs/introduction"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/5 hover:border-yellow-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="text-5xl font-mono font-bold text-yellow-500 group-hover:scale-110 transition-transform duration-300">
                  4<span className="text-2xl">ms</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  dev server startup
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-yellow-600 transition-colors">
              Bun-Native Performance
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Built from scratch for Bun. No webpack, no babel—just fast.
            </p>
          </a>

          {/* File-Based Routing */}
          <a
            href="/docs/routing"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="font-mono text-xs text-muted-foreground space-y-1">
                <div className="group-hover:translate-x-1 transition-transform duration-200">
                  app/
                </div>
                <div className="pl-3 group-hover:translate-x-2 transition-transform duration-200 delay-50">
                  <span className="text-purple-500">page.tsx</span>
                </div>
                <div className="pl-3 group-hover:translate-x-2 transition-transform duration-200 delay-100">
                  api/users/<span className="text-purple-500">route.ts</span>
                </div>
                <div className="pl-3 group-hover:translate-x-2 transition-transform duration-200 delay-150">
                  sockets/<span className="text-purple-500">chat.ts</span>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-purple-600 transition-colors">
              File-Based Everything
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pages, APIs, WebSockets, and jobs—all organized by the file
              system. Zero config.
            </p>
          </a>

          {/* Data Loading */}
          <a
            href="/docs/data-loading"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/5 hover:border-pink-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="font-mono text-xs space-y-1">
                <div className="text-muted-foreground">
                  <span className="text-pink-500">export async function</span>{" "}
                  <span className="text-foreground">loader</span>()
                </div>
                <div className="text-muted-foreground/60 text-[10px] pl-2 group-hover:text-pink-500/70 transition-colors">
                  → Server data → SSR + client
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-pink-600 transition-colors">
              Server Data Loading
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loaders run on the server, data flows to pages. SSR and client
              navigation just work.
            </p>
          </a>

          {/* Type-Safe APIs */}
          <a
            href="/docs/api-routes"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="font-mono text-xs space-y-1">
                <div className="text-muted-foreground">
                  <span className="text-emerald-500">api</span>.users.
                  <span className="text-emerald-600">get</span>()
                </div>
                <div className="text-muted-foreground/60 text-[10px] pl-2 group-hover:text-emerald-500/70 transition-colors">
                  → User[] (inferred)
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-emerald-600 transition-colors">
              Type-Safe API Client
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Auto-generated typed client. No codegen—types flow automatically.
            </p>
          </a>

          {/* WebSockets */}
          <a
            href="/docs/websockets"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="relative">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-blue-500 text-xs font-mono">S</span>
                  </div>
                  <div className="flex flex-col justify-center gap-1">
                    <div className="h-0.5 w-8 bg-blue-500/50 rounded group-hover:w-12 transition-all duration-500" />
                    <div className="h-0.5 w-8 bg-blue-500/30 rounded group-hover:w-10 transition-all duration-500 delay-75" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-blue-500 text-xs font-mono">C</span>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
              Type-Safe WebSockets
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Define protocols once, get typed events everywhere. Built-in
              rooms.
            </p>
          </a>

          {/* Streaming & SSE */}
          <a
            href="/docs/streaming"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 hover:border-cyan-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="space-y-2 w-full max-w-[120px]">
                <div className="h-1.5 bg-cyan-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-1000" />
                </div>
                <div className="h-1.5 bg-cyan-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-cyan-500/70 rounded-full group-hover:w-full transition-all duration-1000 delay-100" />
                </div>
                <div className="h-1.5 bg-cyan-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/4 bg-cyan-500/50 rounded-full group-hover:w-full transition-all duration-1000 delay-200" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-cyan-600 transition-colors">
              Streaming & SSE
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stream responses with{" "}
              <code className="text-xs bg-muted px-1 rounded">useStream()</code>
              . Perfect for AI.
            </p>
          </a>

          {/* Background Jobs */}
          <a
            href="/docs/jobs"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">schedule:</span>{" "}
                <span className="text-green-500 group-hover:animate-pulse">
                  "0 3 * * *"
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-green-600 transition-colors">
              Background Jobs
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cron jobs and intervals built-in. No external queue needed.
            </p>
          </a>

          {/* Validation */}
          <a
            href="/docs/validation"
            className="group rounded-3xl border border-border/60 bg-background p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30 hover:-translate-y-1"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="font-mono text-xs">
                <span className="text-orange-500">route</span>
                <span className="text-muted-foreground">.</span>
                <span className="text-foreground">body</span>
                <span className="text-muted-foreground">(</span>
                <span className="text-green-500">z</span>
                <span className="text-muted-foreground">.</span>
                <span className="text-foreground">object</span>
                <span className="text-muted-foreground">({"{...}"})</span>
                <span className="text-muted-foreground">)</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-orange-600 transition-colors">
              Zod Validation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Validate body, query, and params. Errors handled automatically.
            </p>
          </a>

          {/* Get Started */}
          <a
            href="/docs/introduction"
            className="group rounded-3xl bg-zinc-900 dark:bg-zinc-800 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-2">
                  Ready to build?
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Get Started
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Create your first Bunbox app in under a minute.
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <div className="rounded-full bg-white/10 p-2 group-hover:bg-white/20 group-hover:translate-x-1 transition-all duration-300">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
