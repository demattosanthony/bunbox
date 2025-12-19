import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { detectWorkspace } from "../src/workspace";

describe("workspace detection", () => {
  const testRoot = "/tmp/bunbox-workspace-test";

  beforeEach(() => {
    // Clean up before each test
    try {
      rmSync(testRoot, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(() => {
    // Clean up after each test
    try {
      rmSync(testRoot, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  it("returns null when not in a monorepo", () => {
    // Create a simple project without workspaces
    mkdirSync(testRoot, { recursive: true });
    writeFileSync(
      join(testRoot, "package.json"),
      JSON.stringify({ name: "simple-app" })
    );

    const result = detectWorkspace(testRoot);
    expect(result).toBeNull();
  });

  it("returns null when at monorepo root", () => {
    // Create a monorepo root
    mkdirSync(testRoot, { recursive: true });
    writeFileSync(
      join(testRoot, "package.json"),
      JSON.stringify({
        name: "monorepo",
        workspaces: ["packages/*", "apps/*"],
      })
    );

    // When cwd is at the root, we're not deploying a workspace package
    const result = detectWorkspace(testRoot);
    expect(result).toBeNull();
  });

  it("detects monorepo when in workspace package directory", () => {
    // Create a monorepo structure
    mkdirSync(join(testRoot, "packages", "shared"), { recursive: true });
    mkdirSync(join(testRoot, "apps", "web"), { recursive: true });

    // Root package.json with workspaces
    writeFileSync(
      join(testRoot, "package.json"),
      JSON.stringify({
        name: "monorepo",
        workspaces: ["packages/*", "apps/*"],
      })
    );

    // Workspace package
    writeFileSync(
      join(testRoot, "packages", "shared", "package.json"),
      JSON.stringify({ name: "@my/shared" })
    );

    // App that depends on workspace package
    writeFileSync(
      join(testRoot, "apps", "web", "package.json"),
      JSON.stringify({
        name: "web",
        dependencies: {
          "@my/shared": "workspace:*",
        },
      })
    );

    const result = detectWorkspace(join(testRoot, "apps", "web"));

    expect(result).not.toBeNull();
    expect(result!.root).toBe(testRoot);
    expect(result!.appPath).toBe("apps/web");
    expect(result!.requiredPackages).toContain("packages/shared");
  });

  it("resolves nested workspace dependencies", () => {
    // Create a monorepo with nested deps: app -> pkg-a -> pkg-b
    mkdirSync(join(testRoot, "packages", "pkg-a"), { recursive: true });
    mkdirSync(join(testRoot, "packages", "pkg-b"), { recursive: true });
    mkdirSync(join(testRoot, "apps", "web"), { recursive: true });

    writeFileSync(
      join(testRoot, "package.json"),
      JSON.stringify({
        name: "monorepo",
        workspaces: ["packages/*", "apps/*"],
      })
    );

    writeFileSync(
      join(testRoot, "packages", "pkg-b", "package.json"),
      JSON.stringify({ name: "@my/pkg-b" })
    );

    writeFileSync(
      join(testRoot, "packages", "pkg-a", "package.json"),
      JSON.stringify({
        name: "@my/pkg-a",
        dependencies: {
          "@my/pkg-b": "workspace:*",
        },
      })
    );

    writeFileSync(
      join(testRoot, "apps", "web", "package.json"),
      JSON.stringify({
        name: "web",
        dependencies: {
          "@my/pkg-a": "workspace:*",
        },
      })
    );

    const result = detectWorkspace(join(testRoot, "apps", "web"));

    expect(result).not.toBeNull();
    expect(result!.requiredPackages).toContain("packages/pkg-a");
    expect(result!.requiredPackages).toContain("packages/pkg-b");
  });

  it("handles object-style workspaces config", () => {
    mkdirSync(join(testRoot, "packages", "lib"), { recursive: true });
    mkdirSync(join(testRoot, "apps", "web"), { recursive: true });

    // Object-style workspaces (used by some tools)
    writeFileSync(
      join(testRoot, "package.json"),
      JSON.stringify({
        name: "monorepo",
        workspaces: {
          packages: ["packages/*", "apps/*"],
        },
      })
    );

    writeFileSync(
      join(testRoot, "packages", "lib", "package.json"),
      JSON.stringify({ name: "@my/lib" })
    );

    writeFileSync(
      join(testRoot, "apps", "web", "package.json"),
      JSON.stringify({
        name: "web",
        dependencies: {
          "@my/lib": "workspace:*",
        },
      })
    );

    const result = detectWorkspace(join(testRoot, "apps", "web"));

    expect(result).not.toBeNull();
    expect(result!.appPath).toBe("apps/web");
  });
});
