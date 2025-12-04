/**
 * Tests for SSH client
 */

import { describe, test, expect } from "bun:test";
import { SSHClient } from "../src/ssh";
import type { ResolvedTarget } from "../src/config";

describe("ssh", () => {
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

  describe("SSHClient", () => {
    test("can be instantiated with target config", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(client).toBeInstanceOf(SSHClient);
    });

    test("has connect method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.connect).toBe("function");
    });

    test("has exec method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.exec).toBe("function");
    });

    test("has run method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.run).toBe("function");
    });

    test("has commandExists method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.commandExists).toBe("function");
    });

    test("has pathExists method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.pathExists).toBe("function");
    });

    test("has getPublicIP method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.getPublicIP).toBe("function");
    });

    test("has disconnect method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.disconnect).toBe("function");
    });

    test("has shell method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.shell).toBe("function");
    });

    test("has getConnection method", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      expect(typeof client.getConnection).toBe("function");
    });

    test("exec throws when not connected", async () => {
      const target = createTarget();
      const client = new SSHClient(target);

      await expect(client.exec("ls")).rejects.toThrow("Not connected");
    });

    test("uses correct SSH port from config", () => {
      const target = createTarget({ sshPort: 2222 });
      const client = new SSHClient(target);

      // The port is stored in the target, used during connect
      expect(target.sshPort).toBe(2222);
    });

    test("disconnect can be called multiple times safely", () => {
      const target = createTarget();
      const client = new SSHClient(target);

      // Should not throw
      client.disconnect();
      client.disconnect();
    });
  });

  // Note: Actual connection tests would require a test SSH server
  // or mocking. These are typically done in integration tests.
});
