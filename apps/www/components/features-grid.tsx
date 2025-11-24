import {
  Zap,
  Code,
  Wifi,
  Puzzle,
  Layout,
  Server,
  Globe,
  Cpu,
  ArrowRight,
  Layers,
  GitBranch,
  Terminal,
  FileJson,
} from "lucide-react";

export function FeaturesGrid() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-2xl text-center mb-16 px-6 lg:px-8">
        <h2 className="text-base font-semibold leading-7 text-primary">
          Everything you need
        </h2>
        <p className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          What's in Bunbox?
        </p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Everything you need to build great products on the web, powered by
          Bun.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {/* Built-in Optimizations (Bun Speed) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full flex flex-col justify-between gap-8">
              <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/10 flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] opacity-50" />
                <div className="flex items-center gap-3 z-10">
                  <div className="flex flex-col items-center gap-1">
                    <div className="px-3 py-1.5 rounded-md bg-background border shadow-sm text-xs font-mono text-muted-foreground">
                      next dev
                    </div>
                    <div className="h-8 w-px bg-border/50" />
                    <div className="px-3 py-1.5 rounded-md bg-background border shadow-sm text-xs font-mono text-muted-foreground">
                      1250ms
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center pt-8">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="px-3 py-1.5 rounded-md bg-background border shadow-sm text-xs font-mono font-medium text-foreground">
                      bunbox dev
                    </div>
                    <div className="h-8 w-px bg-yellow-500/50" />
                    <div className="px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 shadow-sm text-xs font-mono text-yellow-600 font-bold">
                      4ms
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-6 text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Built-in Optimizations
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Automatic optimizations powered by Bun's native performance.
                  Start dev server in milliseconds.
                </p>
              </div>
            </div>
          </div>

          {/* WebSocket Support (Chat UI) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full flex flex-col justify-between gap-8">
              <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/10 flex flex-col p-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted border border-border/50 shrink-0" />
                    <div className="bg-background border border-border/50 rounded-2xl rounded-tl-none px-3 py-2 text-[10px] text-muted-foreground shadow-sm max-w-[80%]">
                      Hello! Is this real-time?
                    </div>
                  </div>
                  <div className="flex gap-2 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0 flex items-center justify-center">
                      <Wifi className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="bg-blue-500 text-white rounded-2xl rounded-tr-none px-3 py-2 text-[10px] shadow-sm max-w-[80%]">
                      Yes! Built-in WebSockets.
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-6 text-foreground flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-blue-500" />
                  WebSocket Support
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  First-class WebSocket support with type-safe protocols and
                  automatic reconnection handling.
                </p>
              </div>
            </div>
          </div>

          {/* React Server Components */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full flex flex-col justify-between gap-8">
              <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/10 flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] opacity-50" />
                {/* Simple Tree Visual */}
                <div className="flex flex-col items-center relative z-10">
                  <div className="h-10 w-10 rounded-lg bg-background border shadow-sm flex items-center justify-center mb-4 relative">
                    <Server className="h-5 w-5 text-purple-500" />
                    <div className="absolute -bottom-4 left-1/2 w-px h-4 bg-border" />
                  </div>
                  <div className="flex gap-6">
                    <div className="h-10 w-10 rounded-lg bg-background border shadow-sm flex items-center justify-center relative">
                      <div className="absolute -top-4 left-1/2 w-px h-4 bg-border" />
                      <div className="absolute -top-4 left-1/2 w-[calc(100%+1.5rem)] h-px bg-border -translate-x-1/2" />
                      <FileJson className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-background border shadow-sm flex items-center justify-center relative">
                      <div className="absolute -top-4 left-1/2 w-px h-4 bg-border" />
                      <Layout className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-6 text-foreground flex items-center gap-2">
                  <Server className="h-5 w-5 text-purple-500" />
                  React Server Components
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Build hybrid applications with Server Components for
                  zero-bundle-size logic.
                </p>
              </div>
            </div>
          </div>

          {/* Data Fetching */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <DatabaseIcon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                Data Fetching
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Async/await in Server Components. Supports both server and
                client data fetching strategies.
              </p>
            </div>
          </div>

          {/* CSS Support */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <PaletteIcon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                CSS Support
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built-in support for Tailwind CSS, CSS Modules, and modern
                styling capabilities.
              </p>
            </div>
          </div>

          {/* Client and Server Rendering */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                Client & Server Rendering
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Flexible rendering options including Streaming SSR and Client
                Components.
              </p>
            </div>
          </div>

          {/* Server Actions */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Cpu className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                Server Actions
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Run server code directly from client components with type
                safety.
              </p>
            </div>
          </div>

          {/* Route Handlers */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Puzzle className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                Route Handlers
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Build API endpoints to securely connect with third-party
                services.
              </p>
            </div>
          </div>

          {/* Bunbox Feature Highlight (Dark Card) */}
          <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 text-white p-8 hover:shadow-xl transition-all duration-300 dark:bg-zinc-50 dark:text-zinc-900">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] hover:animate-shine" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
            <div className="relative h-full flex flex-col justify-between min-h-[140px]">
              <div>
                <h3 className="text-2xl font-bold mb-2">Bunbox 1.0</h3>
                <p className="text-white/70 dark:text-zinc-600 text-sm leading-relaxed">
                  The power of full-stack to the frontend.
                </p>
              </div>
              <div className="mt-auto flex justify-end">
                <div className="rounded-full bg-white/10 dark:bg-black/5 p-2 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Routing (Wide) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80 lg:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/50 group-hover:scale-110 transition-transform duration-300">
                <GitBranch className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                  Advanced Routing & Nested Layouts
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                  Create routes using the file system, including support for
                  more advanced routing patterns and UI layouts.
                </p>
              </div>
            </div>
          </div>

          {/* Middleware */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/40 bg-background/50 p-8 hover:shadow-sm transition-all duration-300 hover:bg-background/80">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Layers className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-foreground mb-2">
                Middleware
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Take control of the incoming request. Use code to define routing
                and access rules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function PaletteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
