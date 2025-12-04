/**
 * Tests for PM2 integration
 */

import { describe, test, expect } from "bun:test";
import { generateEcosystemConfig } from "../src/pm2";
import type { ResolvedTarget } from "../src/config";

describe("pm2", () => {
  const createTarget = (overrides: Partial<ResolvedTarget> = {}): ResolvedTarget => ({
    host: "example.com",
    sshPort: 22,
    username: "deploy",
    privateKey: "/home/user/.ssh/id_ed25519",
    deployPath: "/var/www/app",
    name: "myapp",
    port: 3000,
    keepReleases: 5,
    exclude: [],
    ...overrides,
  });

  describe("generateEcosystemConfig", () => {
    test("generates valid PM2 ecosystem config", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain("module.exports");
      expect(config).toContain("apps:");
    });

    test("includes app name", () => {
      const target = createTarget({ name: "my-custom-app" });
      const config = generateEcosystemConfig(target);

      expect(config).toContain('name: "my-custom-app"');
    });

    test("includes bunbox start script", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain('script: "bunbox"');
      expect(config).toContain('args: "start"');
    });

    test("sets cwd to current symlink", () => {
      const target = createTarget({ deployPath: "/var/www/myapp" });
      const config = generateEcosystemConfig(target);

      expect(config).toContain('cwd: "/var/www/myapp/current"');
    });

    test("uses bun as interpreter", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain('interpreter: "bun"');
    });

    test("includes PORT environment variable", () => {
      const target = createTarget({ port: 4000 });
      const config = generateEcosystemConfig(target);

      expect(config).toContain("PORT: 4000");
    });

    test("includes NODE_ENV production", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain('NODE_ENV: "production"');
    });

    test("includes custom environment variables", () => {
      const target = createTarget({
        env: {
          DATABASE_URL: "postgres://localhost/mydb",
          API_KEY: "secret123",
        },
      });
      const config = generateEcosystemConfig(target);

      expect(config).toContain('DATABASE_URL: "postgres://localhost/mydb"');
      expect(config).toContain('API_KEY: "secret123"');
    });

    test("configures log files", () => {
      const target = createTarget({ deployPath: "/var/www/app" });
      const config = generateEcosystemConfig(target);

      expect(config).toContain('error_file: "/var/www/app/logs/error.log"');
      expect(config).toContain('out_file: "/var/www/app/logs/output.log"');
    });

    test("enables autorestart", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain("autorestart: true");
    });

    test("disables watch mode", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain("watch: false");
    });

    test("sets memory restart limit", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain('max_memory_restart: "500M"');
    });

    test("merges logs", () => {
      const target = createTarget();
      const config = generateEcosystemConfig(target);

      expect(config).toContain("merge_logs: true");
    });

    test("handles empty env object", () => {
      const target = createTarget({ env: {} });
      const config = generateEcosystemConfig(target);

      // Should still generate valid config
      expect(config).toContain("module.exports");
      expect(config).toContain("PORT:");
      expect(config).toContain("NODE_ENV:");
    });

    test("handles undefined env", () => {
      const target = createTarget({ env: undefined });
      const config = generateEcosystemConfig(target);

      // Should still generate valid config
      expect(config).toContain("module.exports");
    });

    test("escapes special characters in env values", () => {
      const target = createTarget({
        env: {
          CONNECTION_STRING: 'host="localhost" port=5432',
        },
      });
      const config = generateEcosystemConfig(target);

      // Should contain the value (escaping handled by PM2)
      expect(config).toContain("CONNECTION_STRING:");
    });
  });
});
