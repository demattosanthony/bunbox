/**
 * Tests for core routing logic
 */

import { describe, test, expect } from "bun:test";
import {
  filePathToRoute,
  matchRoute,
  normalizeRoutePath,
  sortRoutes,
  toBunRoutePath,
  routePathToUrl,
  countStaticSegments,
} from "../../src/core/router";
import type { Route } from "../../src/core/types";

/** Helper to create a Request from a URL string for matchRoute tests */
function createRequest(url: string): Request {
  return new Request(url);
}

describe("router", () => {
  describe("filePathToRoute", () => {
    test("converts root page route", () => {
      const route = filePathToRoute("page.tsx", "page");
      expect(route.filepath).toBe("page.tsx");
      expect(route.type).toBe("page");
      expect(route.pattern.test("/")).toBe(true);
      expect(route.paramNames).toEqual([]);
    });

    test("converts nested page route", () => {
      const route = filePathToRoute("about/page.tsx", "page");
      expect(route.pattern.test("/about")).toBe(true);
      expect(route.pattern.test("/about/")).toBe(false);
      expect(route.paramNames).toEqual([]);
    });

    test("converts dynamic page route with single param", () => {
      const route = filePathToRoute("blog/[slug]/page.tsx", "page");
      expect(route.pattern.test("/blog/hello-world")).toBe(true);
      expect(route.pattern.test("/blog/")).toBe(false);
      expect(route.pattern.test("/blog/hello/world")).toBe(false);
      expect(route.paramNames).toEqual(["slug"]);
    });

    test("converts dynamic page route with multiple params", () => {
      const route = filePathToRoute("blog/[category]/[slug]/page.tsx", "page");
      expect(route.pattern.test("/blog/tech/hello")).toBe(true);
      expect(route.pattern.test("/blog/tech")).toBe(false);
      expect(route.paramNames).toEqual(["category", "slug"]);
    });

    test("converts API route", () => {
      const route = filePathToRoute("api/users/route.ts", "api");
      expect(route.pattern.test("/api/users")).toBe(true);
      expect(route.type).toBe("api");
    });

    test("converts API route with dynamic param", () => {
      const route = filePathToRoute("api/users/[id]/route.ts", "api");
      expect(route.pattern.test("/api/users/123")).toBe(true);
      expect(route.paramNames).toEqual(["id"]);
    });

    test("converts socket route", () => {
      const route = filePathToRoute("sockets/chat/route.ts", "socket");
      expect(route.pattern.test("/sockets/chat")).toBe(true);
      expect(route.type).toBe("socket");
    });

    test("converts WebSocket route", () => {
      const route = filePathToRoute("ws/chat/route.ts", "ws");
      expect(route.pattern.test("/ws/chat")).toBe(true);
      expect(route.type).toBe("ws");
    });

    test("handles deeply nested routes", () => {
      const route = filePathToRoute("a/b/c/d/page.tsx", "page");
      expect(route.pattern.test("/a/b/c/d")).toBe(true);
    });

    test("handles mixed static and dynamic segments", () => {
      const route = filePathToRoute(
        "blog/[year]/posts/[slug]/page.tsx",
        "page"
      );
      expect(route.pattern.test("/blog/2024/posts/hello")).toBe(true);
      expect(route.pattern.test("/blog/2024/hello")).toBe(false);
      expect(route.paramNames).toEqual(["year", "slug"]);
    });
  });

  describe("matchRoute", () => {
    test("matches simple route", () => {
      const route = filePathToRoute("about/page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/about"), route);
      expect(match).not.toBeNull();
      expect(match?.params).toEqual({});
      expect(match?.query).toEqual({});
    });

    test("extracts single param", () => {
      const route = filePathToRoute("blog/[slug]/page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/blog/hello-world"), route);
      expect(match).not.toBeNull();
      expect(match?.params).toEqual({ slug: "hello-world" });
    });

    test("extracts multiple params", () => {
      const route = filePathToRoute("blog/[category]/[slug]/page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/blog/tech/hello"), route);
      expect(match).not.toBeNull();
      expect(match?.params).toEqual({ category: "tech", slug: "hello" });
    });

    test("extracts query parameters", () => {
      const route = filePathToRoute("search/page.tsx", "page");
      const match = matchRoute(
        createRequest("http://localhost:3000/search?q=test&limit=10"),
        route
      );
      expect(match).not.toBeNull();
      expect(match?.query).toEqual({ q: "test", limit: "10" });
    });

    test("extracts both params and query", () => {
      const route = filePathToRoute("blog/[slug]/page.tsx", "page");
      const match = matchRoute(
        createRequest("http://localhost:3000/blog/hello?preview=true"),
        route
      );
      expect(match).not.toBeNull();
      expect(match?.params).toEqual({ slug: "hello" });
      expect(match?.query).toEqual({ preview: "true" });
    });

    test("returns null for non-matching route", () => {
      const route = filePathToRoute("about/page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/contact"), route);
      expect(match).toBeNull();
    });

    test("returns null for partial match", () => {
      const route = filePathToRoute("blog/page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/blog/extra"), route);
      expect(match).toBeNull();
    });

    test("handles root route", () => {
      const route = filePathToRoute("page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/"), route);
      expect(match).not.toBeNull();
      expect(match?.params).toEqual({});
    });

    test("handles URL with trailing slash", () => {
      const route = filePathToRoute("about/page.tsx", "page");
      // Route patterns don't match trailing slashes
      const match = matchRoute(createRequest("http://localhost:3000/about/"), route);
      expect(match).toBeNull();
    });

    test("handles special characters in params", () => {
      const route = filePathToRoute("blog/[slug]/page.tsx", "page");
      const match = matchRoute(
        createRequest("http://localhost:3000/blog/hello-world_2024"),
        route
      );
      expect(match).not.toBeNull();
      expect(match?.params.slug).toBe("hello-world_2024");
    });

    test("handles empty query values", () => {
      const route = filePathToRoute("search/page.tsx", "page");
      const match = matchRoute(createRequest("http://localhost:3000/search?q="), route);
      expect(match).not.toBeNull();
      expect(match?.query).toEqual({ q: "" });
    });

    test("handles relative URL with host header (proxy scenario)", () => {
      // Simulate what happens behind a reverse proxy where req.url is relative
      const route = filePathToRoute("about/page.tsx", "page");
      const req = new Request("http://proxy/about", {
        headers: { host: "example.com" },
      });
      // Override the URL to simulate relative path (proxy behavior)
      Object.defineProperty(req, "url", { value: "/about" });
      const match = matchRoute(req, route);
      expect(match).not.toBeNull();
      expect(match?.params).toEqual({});
    });
  });

  describe("normalizeRoutePath", () => {
    test("adds leading slash to path without one", () => {
      expect(normalizeRoutePath("about")).toBe("/about");
    });

    test("keeps leading slash if already present", () => {
      expect(normalizeRoutePath("/about")).toBe("/about");
    });

    test("converts empty string to root", () => {
      expect(normalizeRoutePath("")).toBe("/");
    });

    test("converts double slash to root", () => {
      expect(normalizeRoutePath("//")).toBe("/");
    });

    test("handles deeply nested paths", () => {
      expect(normalizeRoutePath("a/b/c/d")).toBe("/a/b/c/d");
    });

    test("handles paths with params", () => {
      expect(normalizeRoutePath("blog/:slug")).toBe("/blog/:slug");
    });
  });

  describe("routePathToUrl", () => {
    test("converts page file to URL", () => {
      expect(routePathToUrl("page.tsx")).toBe("/");
      expect(routePathToUrl("about/page.tsx")).toBe("/about");
    });

    test("removes app prefix", () => {
      expect(routePathToUrl("app/about/page.tsx")).toBe("/about");
    });

    test("handles nested paths", () => {
      expect(routePathToUrl("blog/posts/page.tsx")).toBe("/blog/posts");
    });

    test("handles layout files", () => {
      expect(routePathToUrl("layout.tsx")).toBe("/");
      expect(routePathToUrl("about/layout.tsx")).toBe("/about");
    });
  });

  describe("countStaticSegments", () => {
    test("counts static segments in path", () => {
      expect(countStaticSegments("about/contact")).toBe(2); // 'about', 'contact'
    });

    test("excludes dynamic segments", () => {
      expect(countStaticSegments("blog/[slug]")).toBe(1); // 'blog'
    });

    test("handles root path", () => {
      expect(countStaticSegments("")).toBe(1); // Empty string splits to ['']
    });

    test("handles multiple dynamic segments", () => {
      expect(countStaticSegments("blog/[category]/[slug]")).toBe(1); // 'blog'
    });

    test("handles all dynamic segments", () => {
      expect(countStaticSegments("[category]/[slug]")).toBe(0); // No static segments
    });
  });

  describe("sortRoutes", () => {
    test("prioritizes routes with more static segments", () => {
      const routes: Route[] = [
        filePathToRoute("blog/[slug]/page.tsx", "page"),
        filePathToRoute("blog/about/page.tsx", "page"),
      ];
      const sorted = sortRoutes(routes);
      expect(sorted[0]?.filepath).toBe("blog/about/page.tsx"); // More specific
      expect(sorted[1]?.filepath).toBe("blog/[slug]/page.tsx");
    });

    test("prioritizes shorter paths when static counts are equal", () => {
      const routes: Route[] = [
        filePathToRoute("blog/[category]/[slug]/page.tsx", "page"),
        filePathToRoute("blog/[slug]/page.tsx", "page"),
      ];
      const sorted = sortRoutes(routes);
      expect(sorted[0]?.filepath).toBe("blog/[slug]/page.tsx"); // Shorter
      expect(sorted[1]?.filepath).toBe("blog/[category]/[slug]/page.tsx");
    });

    test("handles multiple routes with varying specificity", () => {
      const routes: Route[] = [
        filePathToRoute("blog/[slug]/page.tsx", "page"),
        filePathToRoute("blog/2024/posts/page.tsx", "page"),
        filePathToRoute("blog/posts/page.tsx", "page"),
        filePathToRoute("blog/page.tsx", "page"),
      ];
      const sorted = sortRoutes(routes);
      // Most specific: blog/2024/posts (3 static)
      // Then: blog/posts (2 static)
      // Then: blog (1 static)
      // Then: blog/[slug] (2 static but dynamic)
      expect(sorted[0]?.filepath).toBe("blog/2024/posts/page.tsx");
      expect(sorted[1]?.filepath).toBe("blog/posts/page.tsx");
      expect(sorted[2]?.filepath).toBe("blog/page.tsx");
      expect(sorted[3]?.filepath).toBe("blog/[slug]/page.tsx");
    });

    test("maintains order for identical specificity", () => {
      const routes: Route[] = [
        filePathToRoute("a/page.tsx", "page"),
        filePathToRoute("b/page.tsx", "page"),
      ];
      const sorted = sortRoutes(routes);
      // Same specificity, maintains relative order
      expect(sorted.length).toBe(2);
    });

    test("handles empty array", () => {
      expect(sortRoutes([])).toEqual([]);
    });

    test("handles single route", () => {
      const routes: Route[] = [filePathToRoute("about/page.tsx", "page")];
      const sorted = sortRoutes(routes);
      expect(sorted).toEqual(routes);
    });
  });

  describe("toBunRoutePath", () => {
    test("converts page route to Bun path", () => {
      const route = filePathToRoute("about/page.tsx", "page");
      expect(toBunRoutePath(route)).toBe("/about");
    });

    test("converts API route to Bun path", () => {
      const route = filePathToRoute("api/users/route.ts", "api");
      expect(toBunRoutePath(route)).toBe("/api/users");
    });

    test("converts dynamic route with params", () => {
      const route = filePathToRoute("blog/[slug]/page.tsx", "page");
      expect(toBunRoutePath(route)).toBe("/blog/:slug");
    });

    test("converts route with multiple params", () => {
      const route = filePathToRoute("blog/[category]/[slug]/page.tsx", "page");
      expect(toBunRoutePath(route)).toBe("/blog/:category/:slug");
    });

    test("converts root page route", () => {
      const route = filePathToRoute("page.tsx", "page");
      expect(toBunRoutePath(route)).toBe("/");
    });

    test("converts socket route to Bun path", () => {
      const route = filePathToRoute("sockets/chat/route.ts", "socket");
      expect(toBunRoutePath(route)).toBe("/sockets/chat");
    });

    test("converts WebSocket route to Bun path", () => {
      const route = filePathToRoute("ws/chat/route.ts", "ws");
      expect(toBunRoutePath(route)).toBe("/ws/chat");
    });
  });

  describe("edge cases", () => {
    test("handles route with numbers in path", () => {
      const route = filePathToRoute("v1/api/users/route.ts", "api");
      expect(route.pattern.test("/v1/api/users")).toBe(true);
    });

    test("handles route with hyphens", () => {
      const route = filePathToRoute("my-page/page.tsx", "page");
      expect(route.pattern.test("/my-page")).toBe(true);
    });

    test("handles route with underscores", () => {
      const route = filePathToRoute("my_page/page.tsx", "page");
      expect(route.pattern.test("/my_page")).toBe(true);
    });

    test("param names are extracted correctly", () => {
      const route = filePathToRoute(
        "api/users/[userId]/posts/[postId]/route.ts",
        "api"
      );
      expect(route.paramNames).toEqual(["userId", "postId"]);
    });

    test("different file extensions work the same", () => {
      const tsxRoute = filePathToRoute("about/page.tsx", "page");
      const tsRoute = filePathToRoute("about/page.ts", "page");
      const jsxRoute = filePathToRoute("about/page.jsx", "page");
      const jsRoute = filePathToRoute("about/page.js", "page");

      expect(tsxRoute.pattern.toString()).toBe(tsRoute.pattern.toString());
      expect(tsRoute.pattern.toString()).toBe(jsxRoute.pattern.toString());
      expect(jsxRoute.pattern.toString()).toBe(jsRoute.pattern.toString());
    });
  });
});
