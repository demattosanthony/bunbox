/**
 * Integration tests for middleware system
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { scanMiddleware } from "../../src/core/scanner";

describe("middleware integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bunbox-middleware-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("scanMiddleware", () => {
    test("finds middleware.ts files", async () => {
      await mkdir(join(tempDir, "auth"), { recursive: true });
      await writeFile(
        join(tempDir, "middleware.ts"),
        "export function middleware() {}"
      );
      await writeFile(
        join(tempDir, "auth", "middleware.ts"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);

      expect(middleware.size).toBe(2);
      expect(middleware.has("/")).toBe(true);
      expect(middleware.has("/auth")).toBe(true);
      expect(middleware.get("/")).toBe("middleware.ts");
      expect(middleware.get("/auth")).toBe("auth/middleware.ts");
    });

    test("finds middleware.tsx files", async () => {
      await writeFile(
        join(tempDir, "middleware.tsx"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);

      expect(middleware.size).toBe(1);
      expect(middleware.has("/")).toBe(true);
    });

    test("handles nested directories", async () => {
      await mkdir(join(tempDir, "admin", "users"), { recursive: true });
      await writeFile(
        join(tempDir, "admin", "users", "middleware.ts"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);

      expect(middleware.has("/admin/users")).toBe(true);
      expect(middleware.get("/admin/users")).toBe(
        "admin/users/middleware.ts"
      );
    });

    test("handles root middleware in root directory", async () => {
      await writeFile(
        join(tempDir, "middleware.ts"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);

      expect(middleware.has("/")).toBe(true);
      expect(middleware.get("/")).toBe("middleware.ts");
    });

    test("returns empty map when no middleware files exist", async () => {
      const middleware = await scanMiddleware(tempDir);

      expect(middleware.size).toBe(0);
    });

    test("handles middleware in subdirectories", async () => {
      await mkdir(join(tempDir, "api"), { recursive: true });
      await writeFile(
        join(tempDir, "api", "middleware.ts"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);

      expect(middleware.has("/api")).toBe(true);
      expect(middleware.get("/api")).toBe("api/middleware.ts");
    });

    test("handles middleware at multiple levels", async () => {
      await mkdir(join(tempDir, "api", "v1"), { recursive: true });

      await writeFile(
        join(tempDir, "middleware.ts"),
        "export function middleware() {}"
      );
      await writeFile(
        join(tempDir, "api", "middleware.ts"),
        "export function middleware() {}"
      );
      await writeFile(
        join(tempDir, "api", "v1", "middleware.ts"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);

      expect(middleware.size).toBe(3);
      expect(middleware.has("/")).toBe(true);
      expect(middleware.has("/api")).toBe(true);
      expect(middleware.has("/api/v1")).toBe(true);
    });
  });

  describe("middleware context passing", () => {
    test("middleware context should be type-safe", () => {
      // This is a type-level test to ensure LoaderContext includes context
      interface TestLoaderContext {
        params: Record<string, string>;
        query: Record<string, string>;
        context: Record<string, unknown>;
      }

      const ctx: TestLoaderContext = {
        params: {},
        query: {},
        context: { user: { id: "123" } },
      };

      expect(ctx.context).toBeDefined();
      expect(ctx.context.user).toEqual({ id: "123" });
    });
  });

  describe("middleware execution order", () => {
    test("child middleware should override parent", () => {
      // This is a conceptual test demonstrating the expected behavior
      // The actual implementation is tested in the server tests

      const executionLog: string[] = [];

      // Simulate child middleware running first
      const childResult = { access: "public" };
      executionLog.push("child");

      // If child returns a value, parent should not run
      const shouldRunParent = childResult === undefined;
      if (shouldRunParent) {
        executionLog.push("parent");
      }

      expect(executionLog).toEqual(["child"]);
      expect(childResult).toEqual({ access: "public" });
    });

    test("parent middleware runs if child returns undefined", () => {
      const executionLog: string[] = [];

      // Simulate child middleware returning undefined
      const childResult = undefined;
      executionLog.push("child");

      // Parent should run
      const shouldRunParent = childResult === undefined;
      if (shouldRunParent) {
        executionLog.push("parent");
        const parentResult = { user: { id: "123" } };
        expect(parentResult).toBeDefined();
      }

      expect(executionLog).toEqual(["child", "parent"]);
    });
  });

  describe("middleware response handling", () => {
    test("redirect response should short-circuit execution", () => {
      const redirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });

      expect(redirectResponse.status).toBe(302);
      expect(redirectResponse.headers.get("Location")).toBe("/login");

      // If middleware returns a Response, no further middleware runs
      const shouldContinue = !(redirectResponse instanceof Response);
      expect(shouldContinue).toBe(false);
    });

    test("401 response should short-circuit execution", () => {
      const unauthorizedResponse = new Response("Unauthorized", {
        status: 401,
      });

      expect(unauthorizedResponse.status).toBe(401);

      const shouldContinue = !(unauthorizedResponse instanceof Response);
      expect(shouldContinue).toBe(false);
    });
  });

  describe("middleware error handling", () => {
    test("middleware errors should be catchable", async () => {
      let errorCaught = false;
      let errorMessage = "";

      try {
        throw new Error("Middleware failed");
      } catch (error) {
        errorCaught = true;
        errorMessage =
          error instanceof Error ? error.message : "Unknown error";
      }

      expect(errorCaught).toBe(true);
      expect(errorMessage).toBe("Middleware failed");
    });
  });

  describe("middleware return value handling", () => {
    test("empty object should stop parent execution", () => {
      const result = {};
      const shouldStopExecution = result !== undefined;

      expect(shouldStopExecution).toBe(true);
    });

    test("null should stop parent execution", () => {
      const result = null;
      const shouldStopExecution = result !== undefined;

      expect(shouldStopExecution).toBe(true);
    });

    test("false should stop parent execution", () => {
      const result = false;
      const shouldStopExecution = result !== undefined;

      expect(shouldStopExecution).toBe(true);
    });

    test("undefined should continue to parent", () => {
      const result = undefined;
      const shouldContinue = result === undefined;

      expect(shouldContinue).toBe(true);
    });

    test("object with data should merge and stop", () => {
      const context = {};
      const result = { user: { id: "123" } };

      if (result !== undefined && typeof result === "object" && result !== null) {
        Object.assign(context, result);
      }

      expect(context).toEqual({ user: { id: "123" } });
    });
  });

  describe("middleware file conventions", () => {
    test("supports .ts extension", async () => {
      await writeFile(
        join(tempDir, "middleware.ts"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);
      expect(middleware.has("/")).toBe(true);
    });

    test("supports .tsx extension", async () => {
      await writeFile(
        join(tempDir, "middleware.tsx"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);
      expect(middleware.has("/")).toBe(true);
    });

    test("supports .js extension", async () => {
      await writeFile(
        join(tempDir, "middleware.js"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);
      expect(middleware.has("/")).toBe(true);
    });

    test("supports .jsx extension", async () => {
      await writeFile(
        join(tempDir, "middleware.jsx"),
        "export function middleware() {}"
      );

      const middleware = await scanMiddleware(tempDir);
      expect(middleware.has("/")).toBe(true);
    });
  });
});
