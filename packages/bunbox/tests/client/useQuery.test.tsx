/**
 * Tests for useQuery hook
 * Note: These tests verify the generated API client code structure.
 * Full React hook testing would require @testing-library/react.
 */

import { describe, test, expect } from "bun:test";
import { clearQueryCache, clearQueryCacheKey } from "../../src/client/useQuery";

describe("useQuery", () => {
  describe("cache management", () => {
    test("clearQueryCache function exists", () => {
      expect(typeof clearQueryCache).toBe("function");
      // Should not throw
      clearQueryCache();
    });

    test("clearQueryCacheKey function exists", () => {
      expect(typeof clearQueryCacheKey).toBe("function");
      // Should not throw
      clearQueryCacheKey("GET", "/api/users", {});
    });
  });
});
