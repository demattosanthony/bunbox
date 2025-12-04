/**
 * CLI utilities: spinner, logger
 */

import pc from "picocolors";

/**
 * Progress spinner for terminal output
 */
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message = "";

  start(message: string) {
    this.message = message;
    this.frameIndex = 0;

    process.stdout.write(`  ${this.frames[0]} ${message}`);

    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      process.stdout.write(
        `\r  ${pc.cyan(this.frames[this.frameIndex])} ${this.message}`
      );
    }, 80);
  }

  update(message: string) {
    this.message = message;
    process.stdout.write(
      `\r  ${pc.cyan(this.frames[this.frameIndex])} ${message}`
    );
  }

  succeed(message: string) {
    this.stop();
    console.log(`\r  ${pc.green("✓")} ${message}`);
  }

  fail(message: string) {
    this.stop();
    console.log(`\r  ${pc.red("✗")} ${message}`);
  }

  warn(message: string) {
    this.stop();
    console.log(`\r  ${pc.yellow("⚠")} ${message}`);
  }

  info(message: string) {
    this.stop();
    console.log(`\r  ${pc.blue("ℹ")} ${message}`);
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    // Clear the line
    process.stdout.write("\r" + " ".repeat(80) + "\r");
  }
}

/**
 * Logger with colored output
 */
export const log = {
  info: (msg: string) => console.log(`  ${pc.blue("ℹ")} ${msg}`),
  success: (msg: string) => console.log(`  ${pc.green("✓")} ${msg}`),
  warn: (msg: string) => console.log(`  ${pc.yellow("⚠")} ${msg}`),
  error: (msg: string) => console.log(`  ${pc.red("✗")} ${msg}`),
  dim: (msg: string) => console.log(pc.dim(`    ${msg}`)),
  step: (num: number, msg: string) =>
    console.log(`  ${pc.cyan(`[${num}]`)} ${msg}`),
};

/**
 * Print a section header
 */
export function printHeader(title: string): void {
  console.log();
  console.log(pc.bold(`  ${title}`));
  console.log();
}

/**
 * Print a divider line
 */
export function printDivider(): void {
  console.log(pc.dim("  " + "─".repeat(50)));
}

/**
 * Format a key-value pair for display
 */
export function formatKV(key: string, value: string, keyWidth = 12): string {
  const paddedKey = key.padEnd(keyWidth);
  return `  ${pc.dim(paddedKey)} ${value}`;
}

/**
 * Generate a release ID (timestamp)
 */
export function generateReleaseId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

/**
 * Confirm an action with the user
 */
export async function confirm(
  message: string,
  defaultYes = false
): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  process.stdout.write(`  ${message} ${pc.dim(hint)} `);

  // Read a line from stdin
  for await (const line of console as unknown as AsyncIterable<string>) {
    const answer = line.trim().toLowerCase();
    if (answer === "") return defaultYes;
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    process.stdout.write(`  Please answer y or n: `);
  }

  return defaultYes;
}
