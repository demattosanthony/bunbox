import { describe, expect, test } from "bun:test";
import { stream, sse } from "../../src/core/route";

describe("streaming helpers", () => {
  describe("stream()", () => {
    test("creates a response with correct headers", () => {
      const response = stream(async function* () {
        yield "test";
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("text/plain");
      expect(response.headers.get("X-Bunbox-Stream")).toBe("1");
    });

    test("handles string generator", async () => {
      const response = stream(async function* () {
        yield "hello";
        yield " ";
        yield "world";
      });

      const text = await response.text();
      expect(text).toBe("hello world");
    });

    test("handles Uint8Array generator", async () => {
      const encoder = new TextEncoder();
      const response = stream(async function* () {
        yield encoder.encode("hello");
        yield encoder.encode(" world");
      });

      const text = await response.text();
      expect(text).toBe("hello world");
    });

    test("accepts custom headers", () => {
      const response = stream(
        async function* () {
          yield "test";
        },
        { headers: { "X-Custom": "value" } }
      );

      expect(response.headers.get("X-Custom")).toBe("value");
      expect(response.headers.get("Content-Type")).toBe("text/plain");
    });
  });

  describe("sse()", () => {
    test("creates a response with SSE headers", () => {
      const response = sse(async function* () {
        yield { msg: "hi" };
      });

      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
    });

    test("formats data correctly", async () => {
      const response = sse(async function* () {
        yield { id: 1 };
        yield { id: 2 };
      });

      const text = await response.text();
      expect(text).toContain('data: {"id":1}\n\n');
      expect(text).toContain('data: {"id":2}\n\n');
    });

    test("handles generator function", async () => {
      const response = sse(async function* () {
        yield { ok: true };
      });

      const text = await response.text();
      expect(text).toContain('data: {"ok":true}\n\n');
    });
  });
});

