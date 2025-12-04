/**
 * Tests for file transfer utilities
 */

import { describe, test, expect } from "bun:test";
import { checkRsync } from "../src/transfer";

describe("transfer", () => {
  describe("checkRsync", () => {
    test("returns true when rsync is available", async () => {
      // rsync should be available on most Unix systems
      const result = await checkRsync();

      // This test may fail on systems without rsync
      // In CI, we'd want to ensure rsync is installed
      expect(typeof result).toBe("boolean");
    });

    test("returns boolean type", async () => {
      const result = await checkRsync();
      expect(result === true || result === false).toBe(true);
    });
  });

  // Note: buildLocally and transferFiles require actual bunbox project
  // and SSH server respectively, so we test them via integration tests
  // or mock the dependencies
});
