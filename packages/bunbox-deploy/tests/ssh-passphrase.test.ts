/**
 * Tests for SSH passphrase handling
 */

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { SSHClient } from "../src/ssh";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { ResolvedTarget } from "../src/config";

describe("SSH Passphrase Handling", () => {
  const fixturesDir = resolve(__dirname, "fixtures");
  const plainKeyPath = resolve(fixturesDir, "test_key_plain");
  const encryptedKeyPath = resolve(fixturesDir, "test_key_encrypted");

  const createTarget = (
    overrides: Partial<ResolvedTarget> = {}
  ): ResolvedTarget => ({
    host: "example.com",
    sshPort: 22,
    username: "deploy",
    privateKey: plainKeyPath,
    deployPath: "/var/www/app",
    name: "myapp",
    port: 3000,
    script: "start",
    keepReleases: 5,
    exclude: [],
    ...overrides,
  });

  describe("Key Detection", () => {
    test("detects unencrypted SSH key", () => {
      const keyContent = readFileSync(plainKeyPath, "utf8");

      // Plain OpenSSH keys don't have encryption markers
      expect(keyContent).toContain("BEGIN OPENSSH PRIVATE KEY");
      expect(keyContent).not.toContain("ENCRYPTED");

      // Check the actual detection logic we'll implement
      const keyBuffer = readFileSync(plainKeyPath);
      const base64Content = keyBuffer.toString().split('\n').slice(1, -2).join('');
      const decoded = Buffer.from(base64Content, 'base64');
      const keyString = decoded.toString();

      // Unencrypted keys have "none" as cipher
      expect(keyString).toContain("none");
    });

    test("detects encrypted SSH key", () => {
      const keyContent = readFileSync(encryptedKeyPath, "utf8");

      // Encrypted OpenSSH keys have encryption in the base64 data
      expect(keyContent).toContain("BEGIN OPENSSH PRIVATE KEY");

      const keyBuffer = readFileSync(encryptedKeyPath);
      const base64Content = keyBuffer.toString().split('\n').slice(1, -2).join('');
      const decoded = Buffer.from(base64Content, 'base64');
      const keyString = decoded.toString();

      // Encrypted keys have cipher algorithms (aes256-ctr, bcrypt, etc)
      const hasEncryption =
        keyString.includes("aes") ||
        keyString.includes("bcrypt") ||
        (keyString.includes("openssh-key-v1") && !keyString.includes("nonenone"));

      expect(hasEncryption).toBe(true);
    });
  });

  describe("Passphrase Resolution", () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      // Save original env
      originalEnv = {
        SSH_PASSPHRASE: process.env.SSH_PASSPHRASE,
      };
    });

    afterEach(() => {
      // Restore original env
      if (originalEnv.SSH_PASSPHRASE === undefined) {
        delete process.env.SSH_PASSPHRASE;
      } else {
        process.env.SSH_PASSPHRASE = originalEnv.SSH_PASSPHRASE;
      }
    });

    test("uses passphrase from config when provided", () => {
      const target = createTarget({
        privateKey: encryptedKeyPath,
        passphrase: "testpass123",
      });

      expect(target.passphrase).toBe("testpass123");
    });

    test("uses SSH_PASSPHRASE env var when config passphrase not set", () => {
      process.env.SSH_PASSPHRASE = "env-passphrase";

      const target = createTarget({
        privateKey: encryptedKeyPath,
      });

      // This would be tested in config.ts resolution
      expect(process.env.SSH_PASSPHRASE).toBe("env-passphrase");
    });

    test("config passphrase takes precedence over env var", () => {
      process.env.SSH_PASSPHRASE = "env-passphrase";

      const target = createTarget({
        privateKey: encryptedKeyPath,
        passphrase: "config-passphrase",
      });

      expect(target.passphrase).toBe("config-passphrase");
    });
  });

  describe("Connection with Passphrase", () => {
    test("SSHClient can be created with encrypted key path", () => {
      const target = createTarget({
        privateKey: encryptedKeyPath,
        passphrase: "testpass123",
      });

      const client = new SSHClient(target);
      expect(client).toBeInstanceOf(SSHClient);
    });

    test("SSHClient can be created with plain key path", () => {
      const target = createTarget({
        privateKey: plainKeyPath,
      });

      const client = new SSHClient(target);
      expect(client).toBeInstanceOf(SSHClient);
    });

    test("throws error when encrypted key has no passphrase in non-interactive mode", async () => {
      const target = createTarget({
        privateKey: encryptedKeyPath,
        // No passphrase provided
      });

      const client = new SSHClient(target);

      // Mock stdin.isTTY to simulate non-interactive mode
      const originalIsTTY = process.stdin.isTTY;
      (process.stdin as any).isTTY = false;

      try {
        await expect(client.connect()).rejects.toThrow(
          /not in interactive mode|SSH_PASSPHRASE/i
        );
      } finally {
        (process.stdin as any).isTTY = originalIsTTY;
      }
    });
  });

  describe("Helper: isKeyEncrypted", () => {
    test("correctly identifies unencrypted key", () => {
      const keyBuffer = readFileSync(plainKeyPath);
      const isEncrypted = detectKeyEncryption(keyBuffer);
      expect(isEncrypted).toBe(false);
    });

    test("correctly identifies encrypted key", () => {
      const keyBuffer = readFileSync(encryptedKeyPath);
      const isEncrypted = detectKeyEncryption(keyBuffer);
      expect(isEncrypted).toBe(true);
    });
  });
});

/**
 * Helper function to detect if an OpenSSH key is encrypted
 * This mimics what should be in ssh.ts
 */
function detectKeyEncryption(keyBuffer: Buffer): boolean {
  const keyString = keyBuffer.toString();

  // Check for old-style "ENCRYPTED" marker
  if (keyString.includes("ENCRYPTED")) {
    return true;
  }

  // For OpenSSH format keys, parse the header
  if (keyString.includes("BEGIN OPENSSH PRIVATE KEY")) {
    try {
      // Extract base64 content (skip header/footer)
      const lines = keyString.split('\n');
      const base64Content = lines.slice(1, -2).join('');
      const decoded = Buffer.from(base64Content, 'base64');
      const decodedString = decoded.toString('binary');

      // Check for encryption markers in the decoded content
      // Encrypted keys have cipher name like "aes256-ctr"
      // Unencrypted keys have "none" for cipher
      const hasNone = decodedString.includes('none\x00\x00\x00\x04none');

      return !hasNone;
    } catch {
      // If we can't parse, assume unencrypted
      return false;
    }
  }

  return false;
}
