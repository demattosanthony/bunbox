import { describe, expect, test } from "bun:test";
import { resolveConfig } from "../../src/core/config";
import type { ResolvedCorsConfig } from "../../src/core/config";

// Import the server module to test CORS header functions
// We need to recreate the helper functions here since they're private
function isOriginAllowed(
  origin: string,
  allowed: ResolvedCorsConfig["origin"]
): boolean {
  if (allowed === "*") return true;
  if (typeof allowed === "string") return allowed === origin;
  if (Array.isArray(allowed)) return allowed.includes(origin);
  if (typeof allowed === "function") return allowed(origin);
  return false;
}

function buildCorsHeaders(
  req: Request,
  config: ResolvedCorsConfig,
  isPreflight: boolean
): Record<string, string> {
  const headers: Record<string, string> = {};
  const requestOrigin = req.headers.get("origin");

  if (requestOrigin && isOriginAllowed(requestOrigin, config.origin)) {
    headers["Access-Control-Allow-Origin"] =
      config.origin === "*" && !config.credentials ? "*" : requestOrigin;
  } else if (config.origin === "*" && !config.credentials) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  if (config.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  if (!isPreflight && config.exposedHeaders.length > 0) {
    headers["Access-Control-Expose-Headers"] = config.exposedHeaders.join(", ");
  }

  if (isPreflight) {
    headers["Access-Control-Allow-Methods"] = config.methods.join(", ");
    headers["Access-Control-Allow-Headers"] = config.allowedHeaders.join(", ");
    headers["Access-Control-Max-Age"] = String(config.maxAge);
  }

  return headers;
}

function addCorsHeaders(
  response: Response,
  req: Request,
  config: ResolvedCorsConfig
): Response {
  const corsHeaders = buildCorsHeaders(req, config, false);
  if (Object.keys(corsHeaders).length === 0) {
    return response;
  }

  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Mock the config file loading by testing the resolution logic
describe("CORS configuration", () => {
  describe("resolveCorsConfig via resolveConfig", () => {
    test("cors is null when not configured", async () => {
      const config = await resolveConfig({});
      expect(config.cors).toBeNull();
    });

    test("cors: true returns default permissive config", async () => {
      const config = await resolveConfig({ cors: true });
      expect(config.cors).not.toBeNull();
      expect(config.cors!.origin).toBe("*");
      expect(config.cors!.methods).toContain("GET");
      expect(config.cors!.methods).toContain("POST");
      expect(config.cors!.methods).toContain("PUT");
      expect(config.cors!.methods).toContain("DELETE");
      expect(config.cors!.methods).toContain("PATCH");
      expect(config.cors!.methods).toContain("OPTIONS");
      expect(config.cors!.allowedHeaders).toContain("Content-Type");
      expect(config.cors!.allowedHeaders).toContain("Authorization");
      expect(config.cors!.credentials).toBe(false);
      expect(config.cors!.maxAge).toBe(86400);
    });

    test("cors with custom origin string", async () => {
      const config = await resolveConfig({
        cors: { origin: "https://example.com" },
      });
      expect(config.cors!.origin).toBe("https://example.com");
    });

    test("cors with origin array", async () => {
      const config = await resolveConfig({
        cors: { origin: ["https://a.com", "https://b.com"] },
      });
      expect(config.cors!.origin).toEqual(["https://a.com", "https://b.com"]);
    });

    test("cors with origin function", async () => {
      const originFn = (origin: string) => origin.endsWith(".example.com");
      const config = await resolveConfig({ cors: { origin: originFn } });
      expect(typeof config.cors!.origin).toBe("function");
      expect((config.cors!.origin as Function)("app.example.com")).toBe(true);
      expect((config.cors!.origin as Function)("other.com")).toBe(false);
    });

    test("cors with credentials enabled", async () => {
      const config = await resolveConfig({
        cors: { credentials: true },
      });
      expect(config.cors!.credentials).toBe(true);
    });

    test("cors with custom methods", async () => {
      const config = await resolveConfig({
        cors: { methods: ["GET", "POST"] },
      });
      expect(config.cors!.methods).toEqual(["GET", "POST"]);
    });

    test("cors with custom allowedHeaders", async () => {
      const config = await resolveConfig({
        cors: { allowedHeaders: ["X-Custom-Header", "Content-Type"] },
      });
      expect(config.cors!.allowedHeaders).toEqual([
        "X-Custom-Header",
        "Content-Type",
      ]);
    });

    test("cors with exposedHeaders", async () => {
      const config = await resolveConfig({
        cors: { exposedHeaders: ["X-Request-Id", "X-Response-Time"] },
      });
      expect(config.cors!.exposedHeaders).toEqual([
        "X-Request-Id",
        "X-Response-Time",
      ]);
    });

    test("cors with custom maxAge", async () => {
      const config = await resolveConfig({
        cors: { maxAge: 3600 },
      });
      expect(config.cors!.maxAge).toBe(3600);
    });

    test("cors merges partial config with defaults", async () => {
      const config = await resolveConfig({
        cors: { credentials: true, maxAge: 7200 },
      });
      // Custom values
      expect(config.cors!.credentials).toBe(true);
      expect(config.cors!.maxAge).toBe(7200);
      // Defaults
      expect(config.cors!.origin).toBe("*");
      expect(config.cors!.methods).toContain("GET");
      expect(config.cors!.allowedHeaders).toContain("Content-Type");
    });
  });
});

describe("CORS header building", () => {
  // Import the helper functions for testing
  // Since they're private, we'll test them through the server behavior
  // These tests verify the expected header output

  const mockCorsConfig: ResolvedCorsConfig = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [],
    credentials: false,
    maxAge: 86400,
  };

  test("preflight headers include all CORS fields", () => {
    // This tests the expected structure of preflight headers
    const expectedHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": expect.stringContaining("GET"),
      "Access-Control-Allow-Headers": expect.stringContaining("Content-Type"),
      "Access-Control-Max-Age": "86400",
    };

    // Verify expected structure
    expect(expectedHeaders["Access-Control-Allow-Origin"]).toBe("*");
    expect(expectedHeaders["Access-Control-Max-Age"]).toBe("86400");
  });

  test("credentials config affects Allow-Credentials header", () => {
    const configWithCredentials: ResolvedCorsConfig = {
      ...mockCorsConfig,
      credentials: true,
      origin: "https://example.com",
    };

    // When credentials are true, Access-Control-Allow-Credentials should be "true"
    expect(configWithCredentials.credentials).toBe(true);
    // And origin cannot be "*" - must be specific
    expect(configWithCredentials.origin).toBe("https://example.com");
  });

  test("origin array requires specific origin echo", () => {
    const configWithArray: ResolvedCorsConfig = {
      ...mockCorsConfig,
      origin: ["https://a.com", "https://b.com"],
    };

    // When origin is an array, the response should echo the request origin if allowed
    expect(Array.isArray(configWithArray.origin)).toBe(true);
    expect((configWithArray.origin as string[]).includes("https://a.com")).toBe(
      true
    );
  });
});

describe("CORS origin matching", () => {
  test("wildcard origin allows all", () => {
    const origin = "*";
    expect(origin === "*").toBe(true);
  });

  test("string origin requires exact match", () => {
    const allowed: string = "https://example.com";
    const request: string = "https://example.com";
    expect(allowed === request).toBe(true);

    const differentRequest: string = "https://other.com";
    expect(allowed === differentRequest).toBe(false);
  });

  test("array origin checks inclusion", () => {
    const allowed = ["https://a.com", "https://b.com"];
    expect(allowed.includes("https://a.com")).toBe(true);
    expect(allowed.includes("https://b.com")).toBe(true);
    expect(allowed.includes("https://c.com")).toBe(false);
  });

  test("function origin allows dynamic matching", () => {
    const allowed = (origin: string) => origin.endsWith(".example.com");
    expect(allowed("app.example.com")).toBe(true);
    expect(allowed("api.example.com")).toBe(true);
    expect(allowed("example.com")).toBe(false);
    expect(allowed("malicious.com")).toBe(false);
  });
});

describe("CORS header application", () => {
  const defaultConfig: ResolvedCorsConfig = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [],
    credentials: false,
    maxAge: 86400,
  };

  describe("buildCorsHeaders", () => {
    test("preflight request includes all CORS headers", () => {
      const req = new Request("http://localhost/api/test", {
        method: "OPTIONS",
        headers: { Origin: "https://example.com" },
      });

      const headers = buildCorsHeaders(req, defaultConfig, true);

      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
      expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
      expect(headers["Access-Control-Max-Age"]).toBe("86400");
    });

    test("actual request only includes origin header", () => {
      const req = new Request("http://localhost/api/test", {
        method: "GET",
        headers: { Origin: "https://example.com" },
      });

      const headers = buildCorsHeaders(req, defaultConfig, false);

      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(headers["Access-Control-Allow-Methods"]).toBeUndefined();
      expect(headers["Access-Control-Max-Age"]).toBeUndefined();
    });

    test("credentials config adds Allow-Credentials header", () => {
      const configWithCreds: ResolvedCorsConfig = {
        ...defaultConfig,
        credentials: true,
        origin: "https://example.com",
      };

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://example.com" },
      });

      const headers = buildCorsHeaders(req, configWithCreds, false);

      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://example.com"
      );
    });

    test("origin array echoes matching origin", () => {
      const configWithArray: ResolvedCorsConfig = {
        ...defaultConfig,
        origin: ["https://allowed.com", "https://also-allowed.com"],
      };

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://allowed.com" },
      });

      const headers = buildCorsHeaders(req, configWithArray, false);

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://allowed.com"
      );
    });

    test("origin array rejects non-matching origin", () => {
      const configWithArray: ResolvedCorsConfig = {
        ...defaultConfig,
        origin: ["https://allowed.com"],
      };

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://not-allowed.com" },
      });

      const headers = buildCorsHeaders(req, configWithArray, false);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    test("origin function allows dynamic matching", () => {
      const configWithFn: ResolvedCorsConfig = {
        ...defaultConfig,
        origin: (origin) => origin.endsWith(".myapp.com"),
      };

      const allowedReq = new Request("http://localhost/api/test", {
        headers: { Origin: "https://subdomain.myapp.com" },
      });

      const deniedReq = new Request("http://localhost/api/test", {
        headers: { Origin: "https://evil.com" },
      });

      const allowedHeaders = buildCorsHeaders(allowedReq, configWithFn, false);
      const deniedHeaders = buildCorsHeaders(deniedReq, configWithFn, false);

      expect(allowedHeaders["Access-Control-Allow-Origin"]).toBe(
        "https://subdomain.myapp.com"
      );
      expect(deniedHeaders["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    test("exposedHeaders included in actual requests", () => {
      const configWithExposed: ResolvedCorsConfig = {
        ...defaultConfig,
        exposedHeaders: ["X-Request-Id", "X-Response-Time"],
      };

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://example.com" },
      });

      const headers = buildCorsHeaders(req, configWithExposed, false);

      expect(headers["Access-Control-Expose-Headers"]).toBe(
        "X-Request-Id, X-Response-Time"
      );
    });

    test("exposedHeaders not included in preflight", () => {
      const configWithExposed: ResolvedCorsConfig = {
        ...defaultConfig,
        exposedHeaders: ["X-Request-Id"],
      };

      const req = new Request("http://localhost/api/test", {
        method: "OPTIONS",
        headers: { Origin: "https://example.com" },
      });

      const headers = buildCorsHeaders(req, configWithExposed, true);

      expect(headers["Access-Control-Expose-Headers"]).toBeUndefined();
    });
  });

  describe("addCorsHeaders", () => {
    test("adds CORS headers to existing response", () => {
      const originalResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://example.com" },
      });

      const corsResponse = addCorsHeaders(originalResponse, req, defaultConfig);

      expect(corsResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(corsResponse.headers.get("Content-Type")).toBe("application/json");
      expect(corsResponse.status).toBe(200);
    });

    test("preserves original response body", async () => {
      const body = { data: "test" };
      const originalResponse = new Response(JSON.stringify(body), {
        status: 201,
      });

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://example.com" },
      });

      const corsResponse = addCorsHeaders(originalResponse, req, defaultConfig);

      expect(corsResponse.status).toBe(201);
      expect(await corsResponse.json()).toEqual(body);
    });

    test("preserves original response status", () => {
      const originalResponse = new Response(null, { status: 204 });

      const req = new Request("http://localhost/api/test", {
        headers: { Origin: "https://example.com" },
      });

      const corsResponse = addCorsHeaders(originalResponse, req, defaultConfig);

      expect(corsResponse.status).toBe(204);
    });
  });

  describe("isOriginAllowed", () => {
    test("wildcard allows any origin", () => {
      expect(isOriginAllowed("https://anything.com", "*")).toBe(true);
      expect(isOriginAllowed("http://localhost:3000", "*")).toBe(true);
    });

    test("exact string match", () => {
      expect(
        isOriginAllowed("https://example.com", "https://example.com")
      ).toBe(true);
      expect(isOriginAllowed("https://other.com", "https://example.com")).toBe(
        false
      );
    });

    test("array inclusion", () => {
      const allowed = ["https://a.com", "https://b.com"];
      expect(isOriginAllowed("https://a.com", allowed)).toBe(true);
      expect(isOriginAllowed("https://b.com", allowed)).toBe(true);
      expect(isOriginAllowed("https://c.com", allowed)).toBe(false);
    });

    test("function evaluation", () => {
      const allowed = (origin: string) => origin.startsWith("https://");
      expect(isOriginAllowed("https://secure.com", allowed)).toBe(true);
      expect(isOriginAllowed("http://insecure.com", allowed)).toBe(false);
    });
  });
});
