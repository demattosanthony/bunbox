/**
 * Tests for Caddy integration
 */

import { describe, test, expect } from "bun:test";
import { generateCaddyConfig } from "../src/caddy";
import type { ResolvedTarget } from "../src/config";

describe("caddy", () => {
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
    domain: "myapp.com",
    ...overrides,
  });

  describe("generateCaddyConfig", () => {
    test("generates valid Caddyfile", () => {
      const target = createTarget({ domain: "example.com" });
      const config = generateCaddyConfig(target);

      expect(config).toContain("example.com {");
      expect(config).toContain("reverse_proxy");
      expect(config).toContain("}");
    });

    test("throws error when domain is not set", () => {
      const target = createTarget({ domain: undefined });

      expect(() => generateCaddyConfig(target)).toThrow("No domain configured");
    });

    test("configures reverse proxy to correct port", () => {
      const target = createTarget({ domain: "example.com", port: 4000 });
      const config = generateCaddyConfig(target);

      expect(config).toContain("reverse_proxy localhost:4000");
    });

    test("includes header forwarding", () => {
      const target = createTarget({ domain: "example.com" });
      const config = generateCaddyConfig(target);

      expect(config).toContain("header_up Host {host}");
      expect(config).toContain("header_up X-Real-IP {remote}");
      expect(config).toContain("header_up X-Forwarded-For {remote}");
      expect(config).toContain("header_up X-Forwarded-Proto {scheme}");
    });

    test("enables gzip encoding", () => {
      const target = createTarget({ domain: "example.com" });
      const config = generateCaddyConfig(target);

      expect(config).toContain("encode gzip");
    });

    test("configures log output", () => {
      const target = createTarget({
        domain: "example.com",
        deployPath: "/var/www/myapp",
      });
      const config = generateCaddyConfig(target);

      expect(config).toContain("log {");
      expect(config).toContain("output file /var/www/myapp/logs/access.log");
      expect(config).toContain("format json");
    });

    test("includes app name in comment", () => {
      const target = createTarget({ domain: "example.com", name: "my-app" });
      const config = generateCaddyConfig(target);

      expect(config).toContain("# my-app");
    });

    test("handles domain with subdomain", () => {
      const target = createTarget({ domain: "app.example.com" });
      const config = generateCaddyConfig(target);

      expect(config).toContain("app.example.com {");
    });

    test("uses default port 3000", () => {
      const target = createTarget({ domain: "example.com", port: 3000 });
      const config = generateCaddyConfig(target);

      expect(config).toContain("reverse_proxy localhost:3000");
    });

    test("handles different deploy paths", () => {
      const target = createTarget({
        domain: "example.com",
        deployPath: "/opt/apps/myservice",
      });
      const config = generateCaddyConfig(target);

      expect(config).toContain("/opt/apps/myservice/logs/access.log");
    });
  });
});
