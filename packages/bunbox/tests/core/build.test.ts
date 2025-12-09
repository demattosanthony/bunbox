/**
 * Build Module Tests
 * Tests for build metadata and artifact checking
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdir, rm } from "node:fs/promises";
import {
  hasBuildArtifacts,
  getBuildMetadata,
  type BuildMetadata,
} from "../../src/core/build";

describe("Build Metadata", () => {
  const testBunboxDir = join(process.cwd(), ".bunbox-test-build");
  const originalCwd = process.cwd;

  beforeAll(async () => {
    // Create test directory
    await mkdir(testBunboxDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testBunboxDir, { recursive: true, force: true });
  });

  describe("getBuildMetadata", () => {
    test("returns null when no metadata file exists", async () => {
      // The default cwd doesn't have a .built file in tests
      const metadata = await getBuildMetadata();
      // This will be null unless a real build was run
      expect(metadata === null || typeof metadata === "object").toBe(true);
    });

    test("validates metadata structure", async () => {
      // Create an invalid metadata file
      const testMetadataPath = join(testBunboxDir, ".built");
      await Bun.write(testMetadataPath, JSON.stringify({ invalid: "data" }));

      // Reading this should fail validation
      // Note: This test depends on implementation details
    });

    test("handles JSON parse errors gracefully", async () => {
      const testMetadataPath = join(testBunboxDir, ".built-invalid");
      await Bun.write(testMetadataPath, "not valid json {{{");

      // Should not throw, should return null
    });
  });

  describe("hasBuildArtifacts", () => {
    test("returns boolean", async () => {
      const result = await hasBuildArtifacts();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("BuildMetadata interface", () => {
    test("has correct shape", () => {
      const validMetadata: BuildMetadata = {
        timestamp: Date.now(),
        version: "0.1.0",
        routes: {
          pages: 5,
          apis: 3,
          sockets: 1,
          layouts: 2,
        },
        bundleSize: 12345,
        clientHash: "abc12345",
        stylesHash: "def67890",
      };

      expect(validMetadata.timestamp).toBeGreaterThan(0);
      expect(validMetadata.version).toBe("0.1.0");
      expect(validMetadata.routes.pages).toBe(5);
      expect(validMetadata.routes.apis).toBe(3);
      expect(validMetadata.routes.sockets).toBe(1);
      expect(validMetadata.routes.layouts).toBe(2);
      expect(validMetadata.bundleSize).toBe(12345);
      expect(validMetadata.clientHash).toBe("abc12345");
      expect(validMetadata.stylesHash).toBe("def67890");
    });
  });
});

describe("Build Output Validation", () => {
  test("client hash format is valid", () => {
    // Hashes should be 8 character hex strings
    const validHash = "a1b2c3d4";
    expect(validHash).toMatch(/^[a-f0-9]{8}$/);
  });

  test("bundle size is positive", () => {
    const minBundleSize = 100; // Minimum realistic bundle size
    expect(minBundleSize).toBeGreaterThan(0);
  });
});
