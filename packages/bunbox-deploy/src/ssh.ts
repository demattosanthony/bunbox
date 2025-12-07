/**
 * SSH client wrapper using ssh2
 */

import { Client, type ConnectConfig } from "ssh2";
import { readFileSync } from "fs";
import type { ResolvedTarget } from "./config";

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export class SSHClient {
  private conn: Client;
  private connected = false;
  private target: ResolvedTarget;
  private resolvedPassphrase?: string;

  constructor(target: ResolvedTarget) {
    this.target = target;
    this.conn = new Client();
  }

  /**
   * Check if this connection needs a passphrase prompt
   * Call this BEFORE connect() to handle prompting outside of async operations
   */
  needsPassphrasePrompt(): boolean {
    if (this.target.passphrase) return false;

    try {
      const privateKeyBuffer = readFileSync(this.target.privateKey);
      return this.isKeyEncrypted(privateKeyBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Prompt for passphrase - call this before connect() if needsPassphrasePrompt() returns true
   * This allows the caller to stop spinners/animations before prompting
   */
  async promptForPassphrase(): Promise<void> {
    if (!process.stdin.isTTY) {
      throw new Error(
        "SSH key is encrypted but no passphrase provided and not in interactive mode. " +
          "Set passphrase in config or use SSH_PASSPHRASE environment variable."
      );
    }

    this.resolvedPassphrase = await this.securePrompt(
      `Enter passphrase for ${this.target.privateKey}: `
    );

    if (!this.resolvedPassphrase) {
      throw new Error("Passphrase is required for encrypted SSH key");
    }

    // Add key to ssh-agent so rsync and other SSH operations don't prompt again
    await this.addKeyToAgent();
  }

  /**
   * Add the SSH key to ssh-agent using the stored passphrase
   * This allows rsync and other SSH commands to use the key without prompting
   */
  private async addKeyToAgent(): Promise<void> {
    const passphrase = this.resolvedPassphrase || this.target.passphrase;
    if (!passphrase) return;

    // Create a temporary askpass script that outputs the passphrase
    const tempScript = `/tmp/ssh-askpass-${process.pid}-${Date.now()}`;
    const escapedPassphrase = passphrase.replace(/'/g, "'\"'\"'");

    try {
      // Write the askpass script
      await Bun.write(tempScript, `#!/bin/sh\necho '${escapedPassphrase}'`);

      // Make it executable
      const chmodProc = Bun.spawn(["chmod", "+x", tempScript], {
        stdout: "pipe",
        stderr: "pipe",
      });
      await chmodProc.exited;

      // Run ssh-add with our custom askpass
      const sshAddProc = Bun.spawn(["ssh-add", this.target.privateKey], {
        env: {
          ...process.env,
          SSH_ASKPASS: tempScript,
          SSH_ASKPASS_REQUIRE: "force",
          DISPLAY: process.env.DISPLAY || ":0",
        },
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });

      // Close stdin to signal we want SSH_ASKPASS to be used
      sshAddProc.stdin.end();
      await sshAddProc.exited;

      // Silently ignore errors - agent may not be running, but rsync might still work
    } catch {
      // ssh-agent not available, rsync will prompt if needed
    } finally {
      // Clean up temp script
      try {
        const rmProc = Bun.spawn(["rm", "-f", tempScript], {
          stdout: "pipe",
          stderr: "pipe",
        });
        await rmProc.exited;
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Connect to the server
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    // Read the private key
    const privateKeyBuffer = readFileSync(this.target.privateKey);

    // Use passphrase from: 1) pre-prompted, 2) config, 3) prompt now (legacy)
    let passphrase = this.resolvedPassphrase || this.target.passphrase;

    // If key is encrypted and no passphrase yet, prompt for it (legacy path)
    if (!passphrase && this.isKeyEncrypted(privateKeyBuffer)) {
      passphrase = await this.promptPassphrase();
    }

    // Now connect with the resolved passphrase
    return new Promise((resolve, reject) => {
      const config: ConnectConfig = {
        host: this.target.host,
        port: this.target.sshPort ?? 22,
        username: this.target.username,
        privateKey: privateKeyBuffer,
        ...(passphrase && { passphrase }),
      };

      this.conn
        .on("ready", () => {
          this.connected = true;
          resolve();
        })
        .on("error", (err) => {
          reject(new Error(`SSH connection failed: ${err.message}`));
        })
        .connect(config);
    });
  }

  /**
   * Detect if an SSH private key is encrypted
   */
  private isKeyEncrypted(keyBuffer: Buffer): boolean {
    const keyString = keyBuffer.toString();

    // Check for old-style "ENCRYPTED" marker (PEM format)
    if (keyString.includes("ENCRYPTED")) {
      return true;
    }

    // For OpenSSH format keys, parse the header
    if (keyString.includes("BEGIN OPENSSH PRIVATE KEY")) {
      try {
        // Extract base64 content (skip header/footer lines)
        const lines = keyString.split("\n");
        const base64Content = lines.slice(1, -2).join("");
        const decoded = Buffer.from(base64Content, "base64");
        const decodedString = decoded.toString("binary");

        // Unencrypted OpenSSH keys have "none" as both cipher and KDF
        // The format is: ...none\0\0\0\4none...
        const hasNoneCipher = decodedString.includes("none\x00\x00\x00\x04none");

        return !hasNoneCipher;
      } catch {
        // If we can't parse, assume unencrypted to avoid unnecessary prompts
        return false;
      }
    }

    return false;
  }

  /**
   * Prompt user for SSH key passphrase
   */
  private async promptPassphrase(): Promise<string> {
    // Check if stdin is a TTY (interactive terminal)
    if (!process.stdin.isTTY) {
      throw new Error(
        "SSH key is encrypted but no passphrase provided and not in interactive mode. " +
          "Set passphrase in config or use SSH_PASSPHRASE environment variable."
      );
    }

    // Use Bun's built-in password prompt for secure input
    const passphrase = await this.securePrompt(
      `Enter passphrase for ${this.target.privateKey}: `
    );

    if (!passphrase) {
      throw new Error("Passphrase is required for encrypted SSH key");
    }

    return passphrase;
  }

  /**
   * Securely prompt for password input (hidden)
   */
  private async securePrompt(prompt: string): Promise<string> {
    process.stdout.write(prompt);

    return new Promise((resolve, reject) => {
      const stdin = process.stdin;
      const originalRawMode = stdin.isRaw;

      // Set raw mode to capture keystrokes without echoing
      stdin.setRawMode?.(true);
      stdin.resume();

      let password = "";
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          stdin.setRawMode?.(originalRawMode ?? false);
          stdin.removeListener("data", onData);
          stdin.pause();
          process.stdout.write("\n");
        }
      };

      const onData = (data: Buffer) => {
        const char = data.toString("utf8");

        for (const c of char) {
          switch (c) {
            case "\r":
            case "\n":
              cleanup();
              resolve(password);
              return;
            case "\u0003": // Ctrl+C
              cleanup();
              reject(new Error("Cancelled by user"));
              return;
            case "\u0004": // Ctrl+D
              cleanup();
              resolve(password);
              return;
            case "\u007f": // Backspace
            case "\b":
              if (password.length > 0) {
                password = password.slice(0, -1);
              }
              break;
            default:
              // Only add printable characters
              if (c.charCodeAt(0) >= 32) {
                password += c;
              }
              break;
          }
        }
      };

      stdin.on("data", onData);
    });
  }

  /**
   * Execute a command on the remote server
   * Automatically extends PATH to include common user binary locations
   */
  async exec(
    command: string,
    options?: { sudo?: boolean; skipPathExtend?: boolean }
  ): Promise<ExecResult> {
    if (!this.connected) {
      throw new Error("Not connected to server");
    }

    // Extend PATH to include common user binary locations
    // .bashrc often has a guard that exits for non-interactive shells,
    // so we explicitly add common paths instead
    const pathExtend = options?.skipPathExtend
      ? ""
      : 'export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:$PATH"; ';

    const cmd = options?.sudo
      ? `sudo bash -c '${pathExtend}${command}'`
      : `bash -c '${pathExtend}${command}'`;

    return new Promise((resolve, reject) => {
      this.conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);

        let stdout = "";
        let stderr = "";

        stream
          .on("close", (code: number) => {
            resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
          })
          .on("data", (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  /**
   * Execute a command and return success/failure
   */
  async run(command: string, options?: { sudo?: boolean }): Promise<boolean> {
    const result = await this.exec(command, options);
    return result.code === 0;
  }

  /**
   * Check if a command exists on the server
   */
  async commandExists(command: string): Promise<boolean> {
    const result = await this.exec(`which ${command}`);
    return result.code === 0;
  }

  /**
   * Check if a path exists on the server
   */
  async pathExists(path: string): Promise<boolean> {
    const result = await this.exec(`test -e ${path}`);
    return result.code === 0;
  }

  /**
   * Get server's public IP address
   */
  async getPublicIP(): Promise<string> {
    const result = await this.exec(
      "curl -s ifconfig.me || curl -s icanhazip.com || hostname -I | awk '{print $1}'"
    );
    return result.stdout.trim();
  }

  /**
   * Open an interactive shell session
   */
  async shell(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conn.shell((err, stream) => {
        if (err) return reject(err);

        stream.on("close", () => {
          resolve();
        });

        // Pipe stdin/stdout/stderr
        process.stdin.setRawMode?.(true);
        process.stdin.pipe(stream);
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);

        // Handle resize
        process.stdout.on("resize", () => {
          const { columns, rows } = process.stdout;
          stream.setWindow(rows, columns, 0, 0);
        });
      });
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.connected) {
      this.conn.end();
      this.connected = false;
    }
  }

  /**
   * Get the underlying connection for advanced use
   */
  getConnection(): Client {
    return this.conn;
  }
}

/**
 * Create and connect an SSH client
 */
export async function createSSHClient(
  target: ResolvedTarget
): Promise<SSHClient> {
  const client = new SSHClient(target);
  await client.connect();
  return client;
}
