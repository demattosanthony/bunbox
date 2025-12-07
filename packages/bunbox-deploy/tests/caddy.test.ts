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

  });
});
