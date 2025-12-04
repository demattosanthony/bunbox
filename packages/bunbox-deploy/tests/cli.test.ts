/**
 * Tests for CLI functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";

describe("cli", () => {
  const testDir = join(import.meta.dir, ".test-cli");
  const cliPath = join(import.meta.dir, "../bin/cli.ts");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("--help", () => {
    test("shows help message", async () => {
      const proc = Bun.spawn(["bun", cliPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("bunbox-deploy");
      expect(stdout).toContain("Deploy Bunbox applications");
      expect(stdout).toContain("Commands:");
      expect(stdout).toContain("init");
      expect(stdout).toContain("deploy");
      expect(stdout).toContain("rollback");
      expect(stdout).toContain("setup");
    });

    test("shows version with --version", async () => {
      const proc = Bun.spawn(["bun", cliPath, "--version"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("init command", () => {
    test("creates config file", async () => {
      const proc = Bun.spawn(["bun", cliPath, "init"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      await proc.exited;
      const configPath = join(testDir, "bunbox.deploy.ts");

      expect(existsSync(configPath)).toBe(true);
    });

    test("config file contains required structure", async () => {
      const proc = Bun.spawn(["bun", cliPath, "init"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      await proc.exited;
      const configPath = join(testDir, "bunbox.deploy.ts");
      const content = readFileSync(configPath, "utf-8");

      expect(content).toContain("defineDeployConfig");
      expect(content).toContain("targets");
      expect(content).toContain("production");
      expect(content).toContain("host");
      expect(content).toContain("username");
      expect(content).toContain("privateKey");
      expect(content).toContain("deployPath");
      expect(content).toContain("name");
    });

    test("fails if config already exists", async () => {
      // Create initial config
      const proc1 = Bun.spawn(["bun", cliPath, "init"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc1.exited;

      // Try to create again
      const proc2 = Bun.spawn(["bun", cliPath, "init"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc2.exited;
      expect(exitCode).not.toBe(0);
    });

    test("shows success message", async () => {
      const proc = Bun.spawn(["bun", cliPath, "init"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Created");
      expect(stdout).toContain("bunbox.deploy.ts");
    });
  });

  describe("deploy command", () => {
    test("fails without config file", async () => {
      const proc = Bun.spawn(["bun", cliPath, "deploy"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      expect(exitCode).not.toBe(0);
    });

    test("shows error for missing config", async () => {
      const proc = Bun.spawn(["bun", cliPath, "deploy"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("No config file found");
    });
  });

  describe("unknown command", () => {
    test("fails with unknown command", async () => {
      const proc = Bun.spawn(["bun", cliPath, "unknown"], {
        cwd: testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      expect(exitCode).not.toBe(0);
      // Error message includes help hint
      expect(stdout).toContain("bunbox-deploy --help");
    });
  });
});
