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

  constructor(target: ResolvedTarget) {
    this.target = target;
    this.conn = new Client();
  }

  /**
   * Connect to the server
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      const config: ConnectConfig = {
        host: this.target.host,
        port: this.target.sshPort ?? 22,
        username: this.target.username,
        privateKey: readFileSync(this.target.privateKey),
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
   * Execute a command on the remote server
   */
  async exec(
    command: string,
    options?: { sudo?: boolean }
  ): Promise<ExecResult> {
    if (!this.connected) {
      throw new Error("Not connected to server");
    }

    const cmd = options?.sudo ? `sudo ${command}` : command;

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
