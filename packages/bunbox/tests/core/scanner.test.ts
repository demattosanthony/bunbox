/**
 * Tests for route scanner
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  scanPageRoutes,
  scanApiRoutes,
  scanWsRoutes,
  scanLayouts,
} from "../../src/core/scanner";

describe("scanner", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "bunbox-test-"));
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("scanPageRoutes", () => {
    test("finds page.tsx files", async () => {
      await mkdir(join(tempDir, "about"), { recursive: true });
      await writeFile(join(tempDir, "page.tsx"), "export default () => null");
      await writeFile(
        join(tempDir, "about", "page.tsx"),
        "export default () => null"
      );

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(2);
      expect(routes.some((r) => r.filepath === "page.tsx")).toBe(true);
      expect(routes.some((r) => r.filepath === "about/page.tsx")).toBe(true);
      expect(routes.every((r) => r.type === "page")).toBe(true);
    });

    test("finds page.ts files", async () => {
      await writeFile(join(tempDir, "page.ts"), "export default () => null");

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("page.ts");
    });

    test("finds page.jsx files", async () => {
      await writeFile(join(tempDir, "page.jsx"), "export default () => null");

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("page.jsx");
    });

    test("finds page.js files", async () => {
      await writeFile(join(tempDir, "page.js"), "export default () => null");

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("page.js");
    });

    test("finds nested page routes", async () => {
      await mkdir(join(tempDir, "blog", "posts"), { recursive: true });
      await writeFile(
        join(tempDir, "blog", "posts", "page.tsx"),
        "export default () => null"
      );

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("blog/posts/page.tsx");
    });

    test("finds dynamic routes", async () => {
      await mkdir(join(tempDir, "blog", "[slug]"), { recursive: true });
      await writeFile(
        join(tempDir, "blog", "[slug]", "page.tsx"),
        "export default () => null"
      );

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("blog/[slug]/page.tsx");
      expect(routes[0]?.paramNames).toEqual(["slug"]);
    });

    test("excludes api directory", async () => {
      await mkdir(join(tempDir, "api", "users"), { recursive: true });
      await writeFile(
        join(tempDir, "api", "users", "page.tsx"),
        "export default () => null"
      );

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(0);
    });

    test("excludes ws directory", async () => {
      await mkdir(join(tempDir, "ws", "chat"), { recursive: true });
      await writeFile(
        join(tempDir, "ws", "chat", "page.tsx"),
        "export default () => null"
      );

      const routes = await scanPageRoutes(tempDir);

      expect(routes.length).toBe(0);
    });

    test("returns empty array when directory doesn't exist", async () => {
      const routes = await scanPageRoutes(join(tempDir, "nonexistent"));

      expect(routes).toEqual([]);
    });

    test("handles empty directory", async () => {
      const routes = await scanPageRoutes(tempDir);

      expect(routes).toEqual([]);
    });
  });

  describe("scanApiRoutes", () => {
    test("finds route.ts files in api directory", async () => {
      const apiDir = join(tempDir, "api");
      await mkdir(join(apiDir, "users"), { recursive: true });
      await writeFile(
        join(apiDir, "users", "route.ts"),
        "export const GET = () => {}"
      );

      const routes = await scanApiRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("api/users/route.ts");
      expect(routes[0]?.type).toBe("api");
    });

    test("finds nested API routes", async () => {
      const apiDir = join(tempDir, "api");
      await mkdir(join(apiDir, "v1", "users"), { recursive: true });
      await writeFile(
        join(apiDir, "v1", "users", "route.ts"),
        "export const GET = () => {}"
      );

      const routes = await scanApiRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("api/v1/users/route.ts");
    });

    test("finds dynamic API routes", async () => {
      const apiDir = join(tempDir, "api");
      await mkdir(join(apiDir, "users", "[id]"), { recursive: true });
      await writeFile(
        join(apiDir, "users", "[id]", "route.ts"),
        "export const GET = () => {}"
      );

      const routes = await scanApiRoutes(tempDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("api/users/[id]/route.ts");
      expect(routes[0]?.paramNames).toEqual(["id"]);
    });

    test("finds multiple API routes", async () => {
      const apiDir = join(tempDir, "api");
      await mkdir(join(apiDir, "users"), { recursive: true });
      await mkdir(join(apiDir, "posts"), { recursive: true });
      await writeFile(
        join(apiDir, "users", "route.ts"),
        "export const GET = () => {}"
      );
      await writeFile(
        join(apiDir, "posts", "route.ts"),
        "export const GET = () => {}"
      );

      const routes = await scanApiRoutes(tempDir);

      expect(routes.length).toBe(2);
    });

    test("supports all route file extensions", async () => {
      const apiDir = join(tempDir, "api");
      await mkdir(join(apiDir, "a"), { recursive: true });
      await mkdir(join(apiDir, "b"), { recursive: true });
      await mkdir(join(apiDir, "c"), { recursive: true });
      await mkdir(join(apiDir, "d"), { recursive: true });
      await writeFile(join(apiDir, "a", "route.ts"), "");
      await writeFile(join(apiDir, "b", "route.tsx"), "");
      await writeFile(join(apiDir, "c", "route.js"), "");
      await writeFile(join(apiDir, "d", "route.jsx"), "");

      const routes = await scanApiRoutes(tempDir);

      expect(routes.length).toBe(4);
    });

    test("returns empty array when api directory doesn't exist", async () => {
      const routes = await scanApiRoutes(tempDir);

      expect(routes).toEqual([]);
    });
  });

  describe("scanWsRoutes", () => {
    test("finds route.ts files in ws directory", async () => {
      const wsDir = join(tempDir, "ws");
      await mkdir(join(wsDir, "chat"), { recursive: true });
      await writeFile(
        join(wsDir, "chat", "route.ts"),
        "export const onOpen = () => {}"
      );

      const routes = await scanWsRoutes(wsDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("ws/chat/route.ts");
      expect(routes[0]?.type).toBe("ws");
    });

    test("finds nested ws routes", async () => {
      const wsDir = join(tempDir, "ws");
      await mkdir(join(wsDir, "rooms", "chat"), { recursive: true });
      await writeFile(
        join(wsDir, "rooms", "chat", "route.ts"),
        "export const onOpen = () => {}"
      );

      const routes = await scanWsRoutes(wsDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.filepath).toBe("ws/rooms/chat/route.ts");
    });

    test("finds dynamic ws routes", async () => {
      const wsDir = join(tempDir, "ws");
      await mkdir(join(wsDir, "rooms", "[roomId]"), { recursive: true });
      await writeFile(
        join(wsDir, "rooms", "[roomId]", "route.ts"),
        "export const onOpen = () => {}"
      );

      const routes = await scanWsRoutes(wsDir);

      expect(routes.length).toBe(1);
      expect(routes[0]?.paramNames).toEqual(["roomId"]);
    });

    test("returns empty array when directory doesn't exist", async () => {
      const routes = await scanWsRoutes(join(tempDir, "nonexistent"));

      expect(routes).toEqual([]);
    });
  });

  describe("scanLayouts", () => {
    test("finds root layout", async () => {
      await writeFile(
        join(tempDir, "layout.tsx"),
        "export default ({ children }) => children"
      );

      const layouts = await scanLayouts(tempDir);

      expect(layouts.size).toBe(1);
      expect(layouts.get("/")).toBe("layout.tsx");
    });

    test("finds nested layouts", async () => {
      await mkdir(join(tempDir, "blog"), { recursive: true });
      await writeFile(
        join(tempDir, "layout.tsx"),
        "export default ({ children }) => children"
      );
      await writeFile(
        join(tempDir, "blog", "layout.tsx"),
        "export default ({ children }) => children"
      );

      const layouts = await scanLayouts(tempDir);

      expect(layouts.size).toBe(2);
      expect(layouts.get("/")).toBe("layout.tsx");
      expect(layouts.get("/blog")).toBe("blog/layout.tsx");
    });

    test("finds deeply nested layouts", async () => {
      await mkdir(join(tempDir, "a", "b", "c"), { recursive: true });
      await writeFile(
        join(tempDir, "a", "b", "c", "layout.tsx"),
        "export default ({ children }) => children"
      );

      const layouts = await scanLayouts(tempDir);

      expect(layouts.size).toBe(1);
      expect(layouts.get("/a/b/c")).toBe("a/b/c/layout.tsx");
    });

    test("supports all layout file extensions", async () => {
      await writeFile(join(tempDir, "layout.ts"), "");

      const layouts = await scanLayouts(tempDir);

      expect(layouts.size).toBe(1);
    });

    test("returns empty map when no layouts exist", async () => {
      const layouts = await scanLayouts(tempDir);

      expect(layouts.size).toBe(0);
    });

    test("handles app prefix in paths", async () => {
      // Simulate app directory structure
      await mkdir(join(tempDir, "dashboard"), { recursive: true });
      await writeFile(
        join(tempDir, "dashboard", "layout.tsx"),
        "export default ({ children }) => children"
      );

      const layouts = await scanLayouts(tempDir);

      expect(layouts.get("/dashboard")).toBe("dashboard/layout.tsx");
    });
  });

  describe("integration", () => {
    test("scans complete app structure", async () => {
      // Create a realistic app structure
      await mkdir(join(tempDir, "api", "users"), { recursive: true });
      await mkdir(join(tempDir, "blog", "[slug]"), { recursive: true });
      await mkdir(join(tempDir, "ws", "chat"), { recursive: true });

      await writeFile(join(tempDir, "layout.tsx"), "");
      await writeFile(join(tempDir, "page.tsx"), "");
      await writeFile(join(tempDir, "blog", "[slug]", "page.tsx"), "");
      await writeFile(join(tempDir, "api", "users", "route.ts"), "");
      await writeFile(join(tempDir, "ws", "chat", "route.ts"), "");

      const [pages, apis, ws, layouts] = await Promise.all([
        scanPageRoutes(tempDir),
        scanApiRoutes(tempDir),
        scanWsRoutes(join(tempDir, "ws")),
        scanLayouts(tempDir),
      ]);

      expect(pages.length).toBe(2);
      expect(apis.length).toBe(1);
      expect(ws.length).toBe(1);
      expect(layouts.size).toBe(1);
    });

    test("handles mixed file extensions", async () => {
      await mkdir(join(tempDir, "api", "a"), { recursive: true });
      await mkdir(join(tempDir, "b"), { recursive: true });

      await writeFile(join(tempDir, "page.tsx"), "");
      await writeFile(join(tempDir, "b", "page.ts"), "");
      await writeFile(join(tempDir, "api", "a", "route.jsx"), "");
      await writeFile(join(tempDir, "layout.js"), "");

      const [pages, apis, layouts] = await Promise.all([
        scanPageRoutes(tempDir),
        scanApiRoutes(tempDir),
        scanLayouts(tempDir),
      ]);

      expect(pages.length).toBe(2);
      expect(apis.length).toBe(1);
      expect(layouts.size).toBe(1);
    });
  });
});
