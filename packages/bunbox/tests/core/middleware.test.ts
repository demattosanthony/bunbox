/**
 * Tests for middleware utilities
 */

import { describe, test, expect } from "bun:test";
import {
  redirect,
  parseCookies,
  getCookie,
  createSetCookie,
  setCookie,
  deleteCookie,
} from "../../src/core/middleware";

describe("middleware utilities", () => {
  describe("redirect", () => {
    test("creates redirect response with default 302 status", () => {
      const response = redirect("/login");

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login");
    });

    test("creates redirect response with custom status", () => {
      const response = redirect("/permanent", 301);

      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("/permanent");
    });

    test("handles relative paths", () => {
      const response = redirect("../back");
      expect(response.headers.get("Location")).toBe("../back");
    });

    test("handles absolute URLs", () => {
      const response = redirect("https://example.com/login");
      expect(response.headers.get("Location")).toBe(
        "https://example.com/login"
      );
    });
  });

  describe("parseCookies", () => {
    test("parses simple cookie", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "session=abc123" },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({ session: "abc123" });
    });

    test("parses multiple cookies", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "session=abc123; user=john; theme=dark" },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({
        session: "abc123",
        user: "john",
        theme: "dark",
      });
    });

    test("handles cookies with spaces", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: " session = abc123 ; user = john " },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({
        session: "abc123",
        user: "john",
      });
    });

    test("handles URL-encoded values", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "data=hello%20world" },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({ data: "hello world" });
    });

    test("handles values with equals signs", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "token=eyJhbGc=.eyJzdWI=.signature=" },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({ token: "eyJhbGc=.eyJzdWI=.signature=" });
    });

    test("returns empty object for no cookies", () => {
      const request = new Request("http://localhost");

      const cookies = parseCookies(request);

      expect(cookies).toEqual({});
    });

    test("handles empty cookie header", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "" },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({});
    });

    test("ignores malformed cookie entries", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "valid=123; ; another=456" },
      });

      const cookies = parseCookies(request);

      expect(cookies).toEqual({
        valid: "123",
        another: "456",
      });
    });
  });

  describe("getCookie", () => {
    test("gets specific cookie value", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "session=abc123; user=john" },
      });

      const value = getCookie(request, "session");

      expect(value).toBe("abc123");
    });

    test("returns undefined for missing cookie", () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "session=abc123" },
      });

      const value = getCookie(request, "missing");

      expect(value).toBeUndefined();
    });

    test("returns undefined when no cookies", () => {
      const request = new Request("http://localhost");

      const value = getCookie(request, "session");

      expect(value).toBeUndefined();
    });
  });

  describe("createSetCookie", () => {
    test("creates basic cookie string", () => {
      const cookie = createSetCookie("session", "abc123");

      expect(cookie).toBe("session=abc123");
    });

    test("URL-encodes name and value", () => {
      const cookie = createSetCookie("my session", "hello world");

      expect(cookie).toBe("my%20session=hello%20world");
    });

    test("adds Max-Age option", () => {
      const cookie = createSetCookie("session", "abc123", { maxAge: 3600 });

      expect(cookie).toBe("session=abc123; Max-Age=3600");
    });

    test("adds Expires option", () => {
      const expires = new Date("2025-12-31T23:59:59Z");
      const cookie = createSetCookie("session", "abc123", { expires });

      expect(cookie).toContain("session=abc123");
      expect(cookie).toContain("Expires=Wed, 31 Dec 2025 23:59:59 GMT");
    });

    test("adds Path option", () => {
      const cookie = createSetCookie("session", "abc123", { path: "/" });

      expect(cookie).toBe("session=abc123; Path=/");
    });

    test("adds Domain option", () => {
      const cookie = createSetCookie("session", "abc123", {
        domain: "example.com",
      });

      expect(cookie).toBe("session=abc123; Domain=example.com");
    });

    test("adds Secure flag", () => {
      const cookie = createSetCookie("session", "abc123", { secure: true });

      expect(cookie).toBe("session=abc123; Secure");
    });

    test("adds HttpOnly flag", () => {
      const cookie = createSetCookie("session", "abc123", { httpOnly: true });

      expect(cookie).toBe("session=abc123; HttpOnly");
    });

    test("adds SameSite option", () => {
      const cookie = createSetCookie("session", "abc123", {
        sameSite: "Strict",
      });

      expect(cookie).toBe("session=abc123; SameSite=Strict");
    });

    test("combines multiple options", () => {
      const cookie = createSetCookie("session", "abc123", {
        maxAge: 3600,
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
      });

      expect(cookie).toBe(
        "session=abc123; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=Lax"
      );
    });
  });

  describe("setCookie", () => {
    test("adds Set-Cookie header to response", () => {
      const response = new Response("OK");
      const result = setCookie(response, "session", "abc123");

      expect(result.headers.get("Set-Cookie")).toBe("session=abc123");
    });

    test("preserves existing headers", () => {
      const response = new Response("OK", {
        headers: { "Content-Type": "text/plain" },
      });
      const result = setCookie(response, "session", "abc123");

      expect(result.headers.get("Content-Type")).toBe("text/plain");
      expect(result.headers.get("Set-Cookie")).toBe("session=abc123");
    });

    test("preserves response body and status", () => {
      const response = new Response("OK", { status: 200 });
      const result = setCookie(response, "session", "abc123");

      expect(result.status).toBe(200);
    });

    test("passes options to createSetCookie", () => {
      const response = new Response("OK");
      const result = setCookie(response, "session", "abc123", {
        maxAge: 3600,
        path: "/",
        httpOnly: true,
      });

      expect(result.headers.get("Set-Cookie")).toBe(
        "session=abc123; Max-Age=3600; Path=/; HttpOnly"
      );
    });

    test("allows multiple Set-Cookie headers", () => {
      const response = new Response("OK");
      let result = setCookie(response, "session", "abc123");
      result = setCookie(result, "theme", "dark");

      const cookies = result.headers.getSetCookie();
      expect(cookies).toContain("session=abc123");
      expect(cookies).toContain("theme=dark");
    });
  });

  describe("deleteCookie", () => {
    test("creates cookie with Max-Age=0", () => {
      const response = new Response("OK");
      const result = deleteCookie(response, "session");

      const setCookieHeader = result.headers.get("Set-Cookie");
      expect(setCookieHeader).toContain("session=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    test("creates cookie with past Expires date", () => {
      const response = new Response("OK");
      const result = deleteCookie(response, "session");

      const setCookieHeader = result.headers.get("Set-Cookie");
      expect(setCookieHeader).toContain("Expires=Thu, 01 Jan 1970");
    });

    test("preserves path and domain options", () => {
      const response = new Response("OK");
      const result = deleteCookie(response, "session", {
        path: "/app",
        domain: "example.com",
      });

      const setCookieHeader = result.headers.get("Set-Cookie");
      expect(setCookieHeader).toContain("Path=/app");
      expect(setCookieHeader).toContain("Domain=example.com");
    });
  });
});
