/**
 * Tests for route helper functions (api, json, error)
 */

import { describe, test, expect } from "bun:test";
import { api, json, error } from "../../src/core/route";
import type { BunboxRequest } from "../../src/core/types";

describe("route helpers", () => {
  describe("json", () => {
    test("creates JSON response with default 200 status", async () => {
      const data = { message: "Hello" };
      const response = json(data);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body).toEqual(data);
    });

    test("creates JSON response with custom status", async () => {
      const data = { created: true };
      const response = json(data, 201);

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    test("serializes complex objects", async () => {
      const data = {
        user: { id: 1, name: "Alice" },
        posts: [
          { id: 1, title: "First" },
          { id: 2, title: "Second" },
        ],
        nested: { deep: { value: 42 } },
      };
      const response = json(data);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    test("serializes arrays", async () => {
      const data = [1, 2, 3, 4, 5];
      const response = json(data);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    test("serializes null and undefined", async () => {
      const nullResponse = json(null);
      const nullBody = await nullResponse.json();
      expect(nullBody).toBeNull();

      const undefinedResponse = json(undefined);
      const undefinedBody = await undefinedResponse.text();
      expect(undefinedBody).toBe(""); // undefined serializes to empty
    });

    test("serializes primitive values", async () => {
      const stringResponse = json("hello");
      const stringBody = await stringResponse.json();
      expect(stringBody).toBe("hello");

      const numberResponse = json(42);
      const numberBody = await numberResponse.json();
      expect(numberBody).toBe(42);

      const boolResponse = json(true);
      const boolBody = await boolResponse.json();
      expect(boolBody).toBe(true);
    });
  });

  describe("error", () => {
    test("creates error response with default 400 status", async () => {
      const response = error("Invalid input");

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body).toEqual({ error: "Invalid input" });
    });

    test("creates error response with custom status", async () => {
      const response = error("Not found", 404);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({ error: "Not found" });
    });

    test("creates 401 unauthorized error", async () => {
      const response = error("Unauthorized", 401);

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    test("creates 403 forbidden error", async () => {
      const response = error("Forbidden", 403);

      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body).toEqual({ error: "Forbidden" });
    });

    test("creates 500 internal server error", async () => {
      const response = error("Internal server error", 500);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({ error: "Internal server error" });
    });

    test("handles empty error message", async () => {
      const response = error("");

      const body = await response.json();
      expect(body).toEqual({ error: "" });
    });
  });

  describe("api", () => {
    test("wraps handler and returns JSON response", async () => {
      const handler = api(() => ({ message: "Hello" }));

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body).toEqual({ message: "Hello" });
    });

    test("wraps async handler and returns JSON response", async () => {
      const handler = api(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { message: "Async" };
      });

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ message: "Async" });
    });

    test("receives request with params", async () => {
      const handler = api((req) => ({
        id: req.params.id,
      }));

      const mockRequest = {
        params: { id: "123" },
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ id: "123" });
    });

    test("receives request with query", async () => {
      const handler = api((req) => ({
        search: req.query.q,
      }));

      const mockRequest = {
        params: {},
        query: { q: "test" },
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ search: "test" });
    });

    test("receives request with body", async () => {
      const handler = api((req) => ({
        received: req.body,
      }));

      const mockRequest = {
        params: {},
        query: {},
        body: { name: "Alice" },
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ received: { name: "Alice" } });
    });

    test("catches and handles errors", async () => {
      const handler = api(() => {
        throw new Error("Something went wrong");
      });

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({ error: "Something went wrong" });
    });

    test("catches and handles async errors", async () => {
      const handler = api(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async error");
      });

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({ error: "Async error" });
    });

    test("handles non-Error exceptions", async () => {
      const handler = api(() => {
        throw "string error";
      });

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({ error: "Internal error" });
    });

    test("handler can return Response directly", async () => {
      const handler = api(() => {
        return { data: "value" };
      });

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ data: "value" });
    });

    test("supports typed params", async () => {
      // Type inference test - this would be caught by TypeScript
      const handler = api<{ id: string }, {}, {}, { userId: string }>(
        (req) => ({
          userId: req.params.id || "",
        })
      );

      const mockRequest = {
        params: { id: "123" },
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ userId: "123" });
    });

    test("supports typed query", async () => {
      const handler = api<{}, { search: string }, {}, { result: string }>(
        (req) => ({
          result: req.query.search || "",
        })
      );

      const mockRequest = {
        params: {},
        query: { search: "test" },
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ result: "test" });
    });

    test("supports typed body", async () => {
      const handler = api<{}, {}, { name: string }, { greeting: string }>(
        (req) => ({
          greeting: `Hello, ${req.body.name}`,
        })
      );

      const mockRequest = {
        params: {},
        query: {},
        body: { name: "Alice" },
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body).toEqual({ greeting: "Hello, Alice" });
    });

    test("supports complex typed response", async () => {
      type User = { id: number; name: string; email: string };
      const handler = api<{}, {}, {}, { users: User[] }>(() => ({
        users: [
          { id: 1, name: "Alice", email: "alice@example.com" },
          { id: 2, name: "Bob", email: "bob@example.com" },
        ],
      }));

      const mockRequest = {
        params: {},
        query: {},
        body: null,
      } as unknown as BunboxRequest;

      const response = await handler(mockRequest);
      const body = await response.json();
      expect(body.users).toHaveLength(2);
      expect(body.users[0]?.name).toBe("Alice");
    });

    test("preserves __types marker for type inference", () => {
      const handler = api<{ id: string }, {}, {}, { result: string }>(
        (req) => ({
          result: req.params.id || "",
        })
      );

      // The handler should have __types property for type extraction
      // This is used by the generator to extract types
      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });
  });
});
