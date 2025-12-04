/**
 * Tests for CLI utilities
 */

import { describe, test, expect } from "bun:test";
import {
  generateReleaseId,
  formatKV,
} from "../src/utils";

describe("utils", () => {
  describe("generateReleaseId", () => {
    test("generates a timestamp-based ID", () => {
      const id = generateReleaseId();

      // Format: YYYYMMDD_HHMMSS
      expect(id).toMatch(/^\d{8}_\d{6}$/);
    });

    test("generates unique IDs over time", async () => {
      const id1 = generateReleaseId();
      await new Promise((r) => setTimeout(r, 1100)); // Wait 1.1 seconds
      const id2 = generateReleaseId();

      expect(id1).not.toBe(id2);
    });

    test("generates IDs in chronological order", () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(generateReleaseId());
      }

      // All IDs should be the same or increasing (within same second)
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    });

    test("ID represents current time", () => {
      const now = new Date();
      const id = generateReleaseId();

      const year = now.getFullYear().toString();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      expect(id.startsWith(`${year}${month}${day}`)).toBe(true);
    });
  });

  describe("formatKV", () => {
    test("formats key-value with default width", () => {
      const result = formatKV("Server", "example.com");

      expect(result).toContain("Server");
      expect(result).toContain("example.com");
    });

    test("pads key to specified width", () => {
      const result = formatKV("Key", "Value", 20);

      // Key should be padded
      expect(result.length).toBeGreaterThan("Key".length + "Value".length);
    });

    test("handles long keys", () => {
      const result = formatKV("VeryLongKeyName", "Value", 10);

      expect(result).toContain("VeryLongKeyName");
      expect(result).toContain("Value");
    });

    test("handles empty values", () => {
      const result = formatKV("Key", "");

      expect(result).toContain("Key");
    });

    test("handles special characters in values", () => {
      const result = formatKV("Path", "/var/www/app");

      expect(result).toContain("/var/www/app");
    });
  });
});
