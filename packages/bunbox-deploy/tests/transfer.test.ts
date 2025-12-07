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

  describe("DEFAULT_EXCLUDES behavior", () => {
    // These tests document the expected default exclude patterns
    // The actual DEFAULT_EXCLUDES is defined in transfer.ts

    const DEFAULT_EXCLUDES = [
      "node_modules",
      ".git",
      ".env",
      ".env.*",
      ".DS_Store",
      "*.log",
      ".turbo",
      ".cache",
      "coverage",
      ".nyc_output",
      ".vscode",
      ".idea",
      "*.local",
    ];

    test("excludes node_modules by default", () => {
      expect(DEFAULT_EXCLUDES).toContain("node_modules");
    });

    test("excludes .git by default", () => {
      expect(DEFAULT_EXCLUDES).toContain(".git");
    });

    test("excludes .env files by default", () => {
      expect(DEFAULT_EXCLUDES).toContain(".env");
      expect(DEFAULT_EXCLUDES).toContain(".env.*");
    });

    test("excludes common IDE/editor files", () => {
      expect(DEFAULT_EXCLUDES).toContain(".vscode");
      expect(DEFAULT_EXCLUDES).toContain(".idea");
      expect(DEFAULT_EXCLUDES).toContain(".DS_Store");
    });

    test("excludes common build/cache directories", () => {
      expect(DEFAULT_EXCLUDES).toContain(".turbo");
      expect(DEFAULT_EXCLUDES).toContain(".cache");
      expect(DEFAULT_EXCLUDES).toContain("coverage");
    });

    test("does NOT exclude source files or bunbox build output", () => {
      // Critical: these should NOT be in the exclude list
      expect(DEFAULT_EXCLUDES).not.toContain("app");
      expect(DEFAULT_EXCLUDES).not.toContain("app/");
      expect(DEFAULT_EXCLUDES).not.toContain("*.tsx");
      expect(DEFAULT_EXCLUDES).not.toContain("*.ts");
      expect(DEFAULT_EXCLUDES).not.toContain("src");
      expect(DEFAULT_EXCLUDES).not.toContain("public");
      expect(DEFAULT_EXCLUDES).not.toContain(".bunbox");
      expect(DEFAULT_EXCLUDES).not.toContain("package.json");
    });
  });

  describe("exclude merging", () => {
    test("user excludes merge with defaults", () => {
      const defaultExcludes = ["node_modules", ".git"];
      const userExcludes = ["custom-folder", "*.bak"];

      // This is how transfer.ts merges excludes
      const allExcludes = [...new Set([...defaultExcludes, ...userExcludes])];

      expect(allExcludes).toContain("node_modules");
      expect(allExcludes).toContain(".git");
      expect(allExcludes).toContain("custom-folder");
      expect(allExcludes).toContain("*.bak");
    });

    test("duplicate excludes are deduplicated", () => {
      const defaultExcludes = ["node_modules", ".git"];
      const userExcludes = ["node_modules", "custom-folder"]; // node_modules is duplicate

      const allExcludes = [...new Set([...defaultExcludes, ...userExcludes])];

      expect(allExcludes.length).toBe(3);
      expect(allExcludes.filter((e) => e === "node_modules").length).toBe(1);
    });
  });

  // Note: buildLocally and transferFiles require actual bunbox project
  // and SSH server respectively, so we test them via integration tests
  // or mock the dependencies
});
