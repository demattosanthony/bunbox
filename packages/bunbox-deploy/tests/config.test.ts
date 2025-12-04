/**
 * Tests for configuration loading and validation
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import {
  defineDeployConfig,
  loadConfig,
  resolveTarget,
  generateConfigTemplate,
  type DeployConfig,
} from "../src/config";

describe("config", () => {
  const testDir = join(import.meta.dir, ".test-config");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("defineDeployConfig", () => {
    test("returns the config as-is", () => {
      const config: DeployConfig = {
        targets: {
          production: {
            host: "example.com",
            username: "deploy",
            privateKey: "~/.ssh/id_ed25519",
            deployPath: "/var/www/app",
            name: "myapp",
          },
        },
      };

      const result = defineDeployConfig(config);
      expect(result).toEqual(config);
    });

    test("preserves all target properties", () => {
      const config = defineDeployConfig({
        defaultTarget: "staging",
        targets: {
          production: {
            host: "prod.example.com",
            sshPort: 2222,
            username: "deploy",
            privateKey: "~/.ssh/id_ed25519",
            deployPath: "/var/www/app",
            name: "myapp",
            port: 4000,
            domain: "example.com",
            env: { NODE_ENV: "production" },
            keepReleases: 10,
            exclude: ["*.log"],
          },
        },
      });

      expect(config.defaultTarget).toBe("staging");
      expect(config.targets.production?.sshPort).toBe(2222);
      expect(config.targets.production?.port).toBe(4000);
      expect(config.targets.production?.domain).toBe("example.com");
      expect(config.targets.production?.keepReleases).toBe(10);
    });
  });

  describe("loadConfig", () => {
    test("returns null when no config file exists", async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const config = await loadConfig();
        expect(config).toBeNull();
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("throws error for non-existent explicit config path", async () => {
      await expect(loadConfig("nonexistent.ts")).rejects.toThrow(
        "Config file not found"
      );
    });

    test("loads config from bunbox.deploy.ts", async () => {
      const configContent = `
        export default {
          targets: {
            production: {
              host: "example.com",
              username: "deploy",
              privateKey: "~/.ssh/id_ed25519",
              deployPath: "/var/www/app",
              name: "myapp",
            },
          },
        };
      `;

      const configPath = join(testDir, "bunbox.deploy.ts");
      writeFileSync(configPath, configContent);

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const config = await loadConfig();
        expect(config).not.toBeNull();
        expect(config?.targets.production?.host).toBe("example.com");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("validates config structure", async () => {
      const invalidConfig = `
        const config = {
          notTargets: {}
        };
        export default config;
      `;

      // Use a unique filename to avoid module caching
      const uniqueName = `invalid-structure-${Date.now()}.ts`;
      const configPath = join(testDir, uniqueName);
      writeFileSync(configPath, invalidConfig);

      await expect(loadConfig(configPath)).rejects.toThrow(
        "must have 'targets' object"
      );
    });

    test("validates target has required fields", async () => {
      const invalidConfig = `
        const config = {
          targets: {
            production: {
              host: "example.com",
            },
          },
        };
        export default config;
      `;

      // Use a unique filename to avoid module caching
      const uniqueName = `invalid-target-${Date.now()}.ts`;
      const configPath = join(testDir, uniqueName);
      writeFileSync(configPath, invalidConfig);

      await expect(loadConfig(configPath)).rejects.toThrow(
        "missing or invalid"
      );
    });
  });

  describe("resolveTarget", () => {
    const baseConfig: DeployConfig = {
      defaultTarget: "production",
      targets: {
        production: {
          host: "prod.example.com",
          username: "deploy",
          privateKey: "~/.ssh/id_ed25519",
          deployPath: "/var/www/app",
          name: "myapp",
        },
        staging: {
          host: "staging.example.com",
          username: "deploy",
          privateKey: "~/.ssh/id_ed25519",
          deployPath: "/var/www/staging",
          name: "myapp-staging",
        },
      },
    };

    test("resolves explicit target name", () => {
      const { name, target } = resolveTarget(baseConfig, "staging");
      expect(name).toBe("staging");
      expect(target.host).toBe("staging.example.com");
    });

    test("resolves default target when none specified", () => {
      const { name, target } = resolveTarget(baseConfig);
      expect(name).toBe("production");
      expect(target.host).toBe("prod.example.com");
    });

    test("resolves first target when no default and none specified", () => {
      const configWithoutDefault: DeployConfig = {
        targets: {
          alpha: {
            host: "alpha.example.com",
            username: "deploy",
            privateKey: "~/.ssh/id_ed25519",
            deployPath: "/var/www/alpha",
            name: "alpha",
          },
        },
      };

      const { name } = resolveTarget(configWithoutDefault);
      expect(name).toBe("alpha");
    });

    test("throws for unknown target", () => {
      expect(() => resolveTarget(baseConfig, "unknown")).toThrow(
        "Unknown target: unknown"
      );
    });

    test("applies default sshPort", () => {
      const { target } = resolveTarget(baseConfig, "production");
      expect(target.sshPort).toBe(22);
    });

    test("applies default port", () => {
      const { target } = resolveTarget(baseConfig, "production");
      expect(target.port).toBe(3000);
    });

    test("applies default keepReleases", () => {
      const { target } = resolveTarget(baseConfig, "production");
      expect(target.keepReleases).toBe(5);
    });

    test("applies default exclude patterns", () => {
      const { target } = resolveTarget(baseConfig, "production");
      expect(target.exclude).toContain("node_modules");
      expect(target.exclude).toContain(".git");
    });

    test("preserves custom values over defaults", () => {
      const customConfig: DeployConfig = {
        targets: {
          production: {
            host: "example.com",
            sshPort: 2222,
            username: "deploy",
            privateKey: "~/.ssh/id_ed25519",
            deployPath: "/var/www/app",
            name: "myapp",
            port: 4000,
            keepReleases: 10,
            exclude: ["custom.log"],
          },
        },
      };

      const { target } = resolveTarget(customConfig, "production");
      expect(target.sshPort).toBe(2222);
      expect(target.port).toBe(4000);
      expect(target.keepReleases).toBe(10);
      expect(target.exclude).toEqual(["custom.log"]);
    });

    test("expands ~ in privateKey path", () => {
      const { target } = resolveTarget(baseConfig, "production");
      expect(target.privateKey).not.toContain("~");
      expect(target.privateKey).toContain(".ssh/id_ed25519");
    });

    test("resolves environment variable placeholders in env", () => {
      process.env.TEST_DATABASE_URL = "postgres://localhost/test";

      const configWithEnv: DeployConfig = {
        targets: {
          production: {
            host: "example.com",
            username: "deploy",
            privateKey: "~/.ssh/id_ed25519",
            deployPath: "/var/www/app",
            name: "myapp",
            env: {
              DATABASE_URL: "${TEST_DATABASE_URL}",
              STATIC_VALUE: "hello",
            },
          },
        },
      };

      const { target } = resolveTarget(configWithEnv, "production");
      expect(target.env?.DATABASE_URL).toBe("postgres://localhost/test");
      expect(target.env?.STATIC_VALUE).toBe("hello");

      delete process.env.TEST_DATABASE_URL;
    });

    test("handles missing environment variables gracefully", () => {
      const configWithEnv: DeployConfig = {
        targets: {
          production: {
            host: "example.com",
            username: "deploy",
            privateKey: "~/.ssh/id_ed25519",
            deployPath: "/var/www/app",
            name: "myapp",
            env: {
              MISSING_VAR: "${NONEXISTENT_VAR}",
            },
          },
        },
      };

      const { target } = resolveTarget(configWithEnv, "production");
      expect(target.env?.MISSING_VAR).toBe("");
    });
  });

  describe("generateConfigTemplate", () => {
    test("generates valid TypeScript config", () => {
      const template = generateConfigTemplate();

      expect(template).toContain("import { defineDeployConfig }");
      expect(template).toContain("export default defineDeployConfig");
      expect(template).toContain("targets:");
      expect(template).toContain("production:");
    });

    test("includes all essential fields", () => {
      const template = generateConfigTemplate();

      expect(template).toContain("host:");
      expect(template).toContain("username:");
      expect(template).toContain("privateKey:");
      expect(template).toContain("deployPath:");
      expect(template).toContain("name:");
      expect(template).toContain("port:");
    });

    test("includes domain comment", () => {
      const template = generateConfigTemplate();
      expect(template).toContain("domain:");
    });

    test("includes env section", () => {
      const template = generateConfigTemplate();
      expect(template).toContain("env:");
      expect(template).toContain("NODE_ENV:");
    });

    test("includes keepReleases option", () => {
      const template = generateConfigTemplate();
      expect(template).toContain("keepReleases:");
    });
  });
});
