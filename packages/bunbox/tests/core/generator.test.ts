/**
 * Tests for route generation (routes.ts and api-client.ts)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "path";
import {
  generateRoutesFile,
  generateApiClient,
} from "../../src/core/generator";

const TEST_DIR = join(import.meta.dir, "..", "fixtures", "test-app");
const APP_DIR = join(TEST_DIR, "app");
const BUNBOX_DIR = join(TEST_DIR, ".bunbox");

describe("generator", () => {
  beforeEach(async () => {
    // Create test app directory structure
    await mkdir(APP_DIR, { recursive: true });
    await mkdir(join(APP_DIR, "api"), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("generateRoutesFile", () => {
    test("generates routes file for simple page", async () => {
      // Create a simple page
      await writeFile(
        join(APP_DIR, "page.tsx"),
        `export default function Home() { return <h1>Home</h1>; }`
      );

      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const entryPath = await generateRoutesFile(APP_DIR);
        expect(entryPath).toBe(join(BUNBOX_DIR, "entry.ts"));

        // Read generated routes file
        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        // Verify structure
        expect(routesContent).toContain("Auto-generated routes file");
        expect(routesContent).toContain("import Page0 from");
        expect(routesContent).toContain("export const routes = {");
        expect(routesContent).toContain('"/": Page0');
        expect(routesContent).toContain("export const layouts = {");
        expect(routesContent).toContain("export const ssrPages = new Set([");

        // Read generated entry file
        const entryFile = Bun.file(entryPath);
        const entryContent = await entryFile.text();

        expect(entryContent).toContain("Auto-generated entry point");
        expect(entryContent).toContain("import { initBunbox }");
        expect(entryContent).toContain("import { routes, layouts, ssrPages }");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates routes file for multiple pages", async () => {
      // Create multiple pages
      await writeFile(
        join(APP_DIR, "page.tsx"),
        `export default function Home() { return <h1>Home</h1>; }`
      );
      await mkdir(join(APP_DIR, "about"), { recursive: true });
      await writeFile(
        join(APP_DIR, "about", "page.tsx"),
        `export default function About() { return <h1>About</h1>; }`
      );
      await mkdir(join(APP_DIR, "blog"), { recursive: true });
      await writeFile(
        join(APP_DIR, "blog", "page.tsx"),
        `export default function Blog() { return <h1>Blog</h1>; }`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateRoutesFile(APP_DIR);

        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        // Should import all pages
        expect(routesContent).toContain("import Page0 from");
        expect(routesContent).toContain("import Page1 from");
        expect(routesContent).toContain("import Page2 from");

        // Should have all routes (sorted alphabetically by filepath)
        expect(routesContent).toContain('"/about": Page0');
        expect(routesContent).toContain('"/blog": Page1');
        expect(routesContent).toContain('"/": Page2');
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates routes file with dynamic routes", async () => {
      // Create dynamic route
      await mkdir(join(APP_DIR, "blog", "[slug]"), { recursive: true });
      await writeFile(
        join(APP_DIR, "blog", "[slug]", "page.tsx"),
        `type PostProps = { params: { slug: string } };
export default function Post({ params }: PostProps) { return <h1>{params.slug}</h1>; }`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateRoutesFile(APP_DIR);

        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        expect(routesContent).toContain('"/blog/[slug]": Page0');
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates routes file with layouts", async () => {
      // Create page and layout
      await writeFile(
        join(APP_DIR, "page.tsx"),
        `export default function Home() { return <h1>Home</h1>; }`
      );
      await writeFile(
        join(APP_DIR, "layout.tsx"),
        `import type { ReactNode } from "react";
type LayoutProps = { children: ReactNode };
export default function Layout({ children }: LayoutProps) { return <div>{children}</div>; }`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateRoutesFile(APP_DIR);

        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        expect(routesContent).toContain("import Layout1 from");
        expect(routesContent).toContain("export const layouts = {");
        expect(routesContent).toContain('"/": Layout1');
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("identifies SSR pages with 'use server'", async () => {
      // Create SSR page
      await writeFile(
        join(APP_DIR, "page.tsx"),
        `"use server";\nexport default function Home() { return <h1>Home</h1>; }`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateRoutesFile(APP_DIR);

        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        expect(routesContent).toContain("export const ssrPages = new Set([");
        expect(routesContent).toContain('  "/"');
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("handles empty app directory", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateRoutesFile(APP_DIR);

        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        // Should have empty structures
        expect(routesContent).toContain("export const routes = {");
        expect(routesContent).toContain("export const layouts = {");
        expect(routesContent).toContain("export const ssrPages = new Set([");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("sorts routes alphabetically by filepath", async () => {
      // Create pages in non-alphabetical order
      await mkdir(join(APP_DIR, "zebra"), { recursive: true });
      await writeFile(
        join(APP_DIR, "zebra", "page.tsx"),
        `export default function Zebra() { return <h1>Zebra</h1>; }`
      );
      await mkdir(join(APP_DIR, "apple"), { recursive: true });
      await writeFile(
        join(APP_DIR, "apple", "page.tsx"),
        `export default function Apple() { return <h1>Apple</h1>; }`
      );
      await mkdir(join(APP_DIR, "mango"), { recursive: true });
      await writeFile(
        join(APP_DIR, "mango", "page.tsx"),
        `export default function Mango() { return <h1>Mango</h1>; }`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateRoutesFile(APP_DIR);

        const routesFile = Bun.file(join(BUNBOX_DIR, "routes.ts"));
        const routesContent = await routesFile.text();

        // Should be sorted: apple, mango, zebra
        const appleIndex = routesContent.indexOf('"/apple": Page');
        const mangoIndex = routesContent.indexOf('"/mango": Page');
        const zebraIndex = routesContent.indexOf('"/zebra": Page');

        expect(appleIndex).toBeLessThan(mangoIndex);
        expect(mangoIndex).toBeLessThan(zebraIndex);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("generateApiClient", () => {
    test("generates empty API client when no routes exist", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        expect(apiClientContent).toContain("Auto-generated typed API client");
        expect(apiClientContent).toContain("export const api = {");
        expect(apiClientContent).toContain("async function request");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates API client for simple GET route", async () => {
      // Create simple API route
      await mkdir(join(APP_DIR, "api", "health"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "health", "route.ts"),
        `export const GET = () => new Response("OK");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should import the route
        expect(apiClientContent).toContain("import type * as Route0 from");
        expect(apiClientContent).toContain("api/health/route.ts");

        // Should have health endpoint
        expect(apiClientContent).toContain("health: {");
        expect(apiClientContent).toContain("GET: createApiMethod");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates API client for route with multiple methods", async () => {
      // Create API route with multiple methods
      await mkdir(join(APP_DIR, "api", "users"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "users", "route.ts"),
        `export const GET = () => new Response("GET");
export const POST = () => new Response("POST");
export const DELETE = () => new Response("DELETE");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should have all methods
        expect(apiClientContent).toContain("users: {");
        expect(apiClientContent).toContain("GET: createApiMethod");
        expect(apiClientContent).toContain("POST: createApiMethod");
        expect(apiClientContent).toContain("DELETE: createApiMethod");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates API client for nested routes", async () => {
      // Create nested API routes
      await mkdir(join(APP_DIR, "api", "v1", "users"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "v1", "users", "route.ts"),
        `export const GET = () => new Response("GET");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should have nested structure
        expect(apiClientContent).toContain("v1: {");
        expect(apiClientContent).toContain("users: {");
        expect(apiClientContent).toContain("GET: createApiMethod");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates API client for dynamic route", async () => {
      // Create dynamic API route
      await mkdir(join(APP_DIR, "api", "users", "[id]"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "users", "[id]", "route.ts"),
        `export const GET = () => new Response("GET");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should have dynamic segment (using :id format for Bun router)
        expect(apiClientContent).toContain("users: {");
        expect(apiClientContent).toContain('":id": {');
        expect(apiClientContent).toContain("GET: createApiMethod");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates type aliases for typed API routes", async () => {
      // Create typed API route using route builder
      await mkdir(join(APP_DIR, "api", "users"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "users", "route.ts"),
        `import { route } from "bunbox";
const UsersSchema = { parse: () => ({ users: [] as string[] }) };
export const GET = route
  .body(UsersSchema)
  .handle(({ body }) => body);`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should generate type aliases
        expect(apiClientContent).toContain("type Route0_GET_Params =");
        expect(apiClientContent).toContain("type Route0_GET_Query =");
        expect(apiClientContent).toContain("type Route0_GET_Body =");
        expect(apiClientContent).toContain("type Route0_GET_Response =");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates API client with correct paths", async () => {
      // Create API route at root level
      await mkdir(join(APP_DIR, "api", "root"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "root", "route.ts"),
        `export const GET = () => new Response("ROOT");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Path should be relative to /api
        expect(apiClientContent).toContain("GET: createApiMethod");
        expect(apiClientContent).toContain('"/api/root"');
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("sorts routes alphabetically", async () => {
      // Create multiple API routes in non-alphabetical order
      await mkdir(join(APP_DIR, "api", "zebra"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "zebra", "route.ts"),
        `export const GET = () => new Response("zebra");`
      );
      await mkdir(join(APP_DIR, "api", "apple"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "apple", "route.ts"),
        `export const GET = () => new Response("apple");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should be sorted alphabetically
        const appleIndex = apiClientContent.indexOf("apple: {");
        const zebraIndex = apiClientContent.indexOf("zebra: {");
        expect(appleIndex).toBeLessThan(zebraIndex);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("handles config hostname and port", async () => {
      await mkdir(join(APP_DIR, "api", "test"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "test", "route.ts"),
        `export const GET = () => new Response("test");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR, {
          hostname: "example.com",
          port: 8080,
          appDir: APP_DIR,
          wsDir: join(APP_DIR, "ws"),
          socketsDir: join(APP_DIR, "sockets"),
          publicDir: join(TEST_DIR, "public"),
          development: false,
        });

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should include custom config
        expect(apiClientContent).toContain("example.com");
        expect(apiClientContent).toContain("8080");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("handles routes without valid exports gracefully", async () => {
      // Create route with no exports
      await mkdir(join(APP_DIR, "api", "invalid"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "invalid", "route.ts"),
        `// No exports`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should not include invalid route
        expect(apiClientContent).not.toContain("invalid");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates request function with proper fetch logic", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should have request function with all features
        expect(apiClientContent).toContain(
          "async function request<TResponse, TParams = Record<string, unknown>, TQuery = Record<string, unknown>, TBody = unknown>"
        );
        expect(apiClientContent).toContain("opts?.params");
        expect(apiClientContent).toContain("opts?.query");
        expect(apiClientContent).toContain("opts?.body");
        expect(apiClientContent).toContain("opts?.headers");
        expect(apiClientContent).toContain("JSON.stringify(opts.body)");
        expect(apiClientContent).toContain("if (!res.ok) throw new Error");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates useQuery imports and types", async () => {
      // Create simple API route
      await mkdir(join(APP_DIR, "api", "test"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "test", "route.ts"),
        `export const GET = () => new Response("TEST");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should import useQuery utilities
        expect(apiClientContent).toContain("import { createQueryHook }");
        expect(apiClientContent).toContain("useQuery");
        expect(apiClientContent).toContain(
          "import type { UseQueryOptions, UseQueryResult }"
        );
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates createApiMethod helper function", async () => {
      // Create simple API route
      await mkdir(join(APP_DIR, "api", "data"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "data", "route.ts"),
        `export const GET = () => new Response("DATA");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should have createApiMethod helper
        expect(apiClientContent).toContain("function createApiMethod");
        expect(apiClientContent).toContain("fn.useQuery =");
        expect(apiClientContent).toContain("fn.useStream =");
        expect(apiClientContent).toContain(
          "createQueryHook<ClientResponse<TResponse>>"
        );

        // Should have type definitions
        expect(apiClientContent).toContain("type ApiMethod<");
        expect(apiClientContent).toContain("type ApiMethodOptions<");
        expect(apiClientContent).toContain("type ClientResponse<");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates API methods with useQuery support", async () => {
      // Create API route
      await mkdir(join(APP_DIR, "api", "items"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "items", "route.ts"),
        `export const GET = () => new Response("ITEMS");
export const POST = () => new Response("CREATED");`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should generate methods using createApiMethod
        expect(apiClientContent).toContain("items: {");
        expect(apiClientContent).toContain(
          'GET: createApiMethod<Route0_GET_Response, Route0_GET_Params, Route0_GET_Query, Route0_GET_Body>("GET", "/api/items")'
        );
        expect(apiClientContent).toContain(
          'POST: createApiMethod<Route0_POST_Response, Route0_POST_Params, Route0_POST_Query, Route0_POST_Body>("POST", "/api/items")'
        );
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates correct types for streaming responses", async () => {
      // Create streaming API route
      await mkdir(join(APP_DIR, "api", "stream"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "stream", "route.ts"),
        `import type { SSEResponse } from "bunbox";
export const GET = (): SSEResponse<{ token: string }> => {
  return null as any; // Mock implementation
};`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should extract return type from direct function exports
        expect(apiClientContent).toContain(
          "Awaited<ReturnType<typeof Route0.GET>>"
        );

        // Should have useStream with proper type extraction
        expect(apiClientContent).toContain(
          "type ExtractedType = TResponse extends { __type: infer U } ? U : TResponse;"
        );
        expect(apiClientContent).toContain(
          "return useStreamHook<ExtractedType>(fn, opts);"
        );

        // Should have ClientResponse type that handles streaming
        expect(apiClientContent).toContain("type ClientResponse<T>");
        expect(apiClientContent).toContain("__brand: 'streaming'");
        expect(apiClientContent).toContain("__brand: 'sse'");
        expect(apiClientContent).toContain("AsyncIterable<U>");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("generates fallback to ReturnType for direct function exports", async () => {
      // Create route with direct function export
      await mkdir(join(APP_DIR, "api", "direct"), { recursive: true });
      await writeFile(
        join(APP_DIR, "api", "direct", "route.ts"),
        `export const GET = async () => new Response(JSON.stringify({ id: 1 }));`
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        await generateApiClient(APP_DIR);

        const apiClientFile = Bun.file(join(BUNBOX_DIR, "api-client.ts"));
        const apiClientContent = await apiClientFile.text();

        // Should have type extraction that handles both __types and ReturnType
        expect(apiClientContent).toContain(
          "typeof Route0.GET extends { __types: { response: infer T } } ? T : Awaited<ReturnType<typeof Route0.GET>>"
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
