import pc from "picocolors";

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

  succeed(message: string) {
    this.stop();
    console.log(`\r  ${pc.green("✓")} ${message}`);
  }

  fail(message: string) {
    this.stop();
    console.log(`\r  ${pc.red("✗")} ${message}`);
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
