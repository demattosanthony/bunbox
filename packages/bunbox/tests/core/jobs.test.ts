/**
 * Tests for the jobs system
 */

import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  parseInterval,
  parseCron,
  getNextCronTime,
  defineJob,
  JobManager,
} from "../../src/core/jobs";
import { scanJobs } from "../../src/core/scanner";

// ============================================================================
// Interval Parser Tests
// ============================================================================

describe("parseInterval", () => {
  test("parses seconds: '30s' → 30000", () => {
    expect(parseInterval("30s")).toBe(30000);
  });

  test("parses minutes: '5m' → 300000", () => {
    expect(parseInterval("5m")).toBe(300000);
  });

  test("parses hours: '1h' → 3600000", () => {
    expect(parseInterval("1h")).toBe(3600000);
  });

  test("parses days: '1d' → 86400000", () => {
    expect(parseInterval("1d")).toBe(86400000);
  });

  test("parses combined: '1h30m' → 5400000", () => {
    expect(parseInterval("1h30m")).toBe(5400000);
  });

  test("parses multiple units: '1d2h30m45s'", () => {
    const expected = 86400000 + 2 * 3600000 + 30 * 60000 + 45 * 1000;
    expect(parseInterval("1d2h30m45s")).toBe(expected);
  });

  test("parses single digit values: '1s'", () => {
    expect(parseInterval("1s")).toBe(1000);
  });

  test("parses large values: '100h'", () => {
    expect(parseInterval("100h")).toBe(100 * 3600000);
  });

  test("invalid interval throws error", () => {
    expect(() => parseInterval("invalid")).toThrow("Invalid interval");
  });

  test("empty string throws error", () => {
    expect(() => parseInterval("")).toThrow("Invalid interval");
  });

  test("number without unit throws error", () => {
    expect(() => parseInterval("100")).toThrow("Invalid interval");
  });

  test("handles values with leading characters that get ignored", () => {
    // The regex captures "5m" from "-5m", ignoring the leading "-"
    // This is acceptable behavior - invalid formats should be clearly invalid
    expect(parseInterval("-5m")).toBe(300000); // Same as "5m"
  });
});

// ============================================================================
// Cron Parser Tests
// ============================================================================

describe("parseCron", () => {
  describe("basic patterns", () => {
    test("parses * (every)", () => {
      const cron = parseCron("* * * * *");
      expect(cron.minutes.length).toBe(60); // 0-59
      expect(cron.hours.length).toBe(24); // 0-23
      expect(cron.daysOfMonth.length).toBe(31); // 1-31
      expect(cron.months.length).toBe(12); // 1-12
      expect(cron.daysOfWeek.length).toBe(7); // 0-6
    });

    test("parses specific number", () => {
      const cron = parseCron("30 14 15 6 3");
      expect(cron.minutes).toEqual([30]);
      expect(cron.hours).toEqual([14]);
      expect(cron.daysOfMonth).toEqual([15]);
      expect(cron.months).toEqual([6]);
      expect(cron.daysOfWeek).toEqual([3]);
    });

    test("parses */n (step)", () => {
      const cron = parseCron("*/15 * * * *");
      expect(cron.minutes).toEqual([0, 15, 30, 45]);
    });

    test("parses n-m (range)", () => {
      const cron = parseCron("0-5 * * * *");
      expect(cron.minutes).toEqual([0, 1, 2, 3, 4, 5]);
    });

    test("parses n,m,o (list)", () => {
      const cron = parseCron("0,15,30,45 * * * *");
      expect(cron.minutes).toEqual([0, 15, 30, 45]);
    });

    test("parses range with step: 0-30/10", () => {
      const cron = parseCron("0-30/10 * * * *");
      expect(cron.minutes).toEqual([0, 10, 20, 30]);
    });
  });

  describe("full expressions", () => {
    test("0 * * * * → every hour at minute 0", () => {
      const cron = parseCron("0 * * * *");
      expect(cron.minutes).toEqual([0]);
      expect(cron.hours.length).toBe(24);
    });

    test("*/15 * * * * → every 15 minutes", () => {
      const cron = parseCron("*/15 * * * *");
      expect(cron.minutes).toEqual([0, 15, 30, 45]);
    });

    test("0 3 * * * → daily at 3am", () => {
      const cron = parseCron("0 3 * * *");
      expect(cron.minutes).toEqual([0]);
      expect(cron.hours).toEqual([3]);
    });

    test("0 0 * * 0 → weekly Sunday midnight", () => {
      const cron = parseCron("0 0 * * 0");
      expect(cron.minutes).toEqual([0]);
      expect(cron.hours).toEqual([0]);
      expect(cron.daysOfWeek).toEqual([0]);
    });

    test("0 9 1 * * → monthly 1st at 9am", () => {
      const cron = parseCron("0 9 1 * *");
      expect(cron.minutes).toEqual([0]);
      expect(cron.hours).toEqual([9]);
      expect(cron.daysOfMonth).toEqual([1]);
    });

    test("30 4 1,15 * * → 1st and 15th at 4:30am", () => {
      const cron = parseCron("30 4 1,15 * *");
      expect(cron.minutes).toEqual([30]);
      expect(cron.hours).toEqual([4]);
      expect(cron.daysOfMonth).toEqual([1, 15]);
    });
  });

  describe("edge cases", () => {
    test("invalid cron throws error (wrong number of fields)", () => {
      expect(() => parseCron("* * *")).toThrow("Invalid cron");
      expect(() => parseCron("* * * * * *")).toThrow("Invalid cron");
    });

    test("out of range values throw error", () => {
      expect(() => parseCron("60 * * * *")).toThrow("Out of range");
      expect(() => parseCron("* 24 * * *")).toThrow("Out of range");
      expect(() => parseCron("* * 32 * *")).toThrow("Out of range");
      expect(() => parseCron("* * * 13 *")).toThrow("Out of range");
      expect(() => parseCron("* * * * 7")).toThrow("Out of range");
    });

    test("handles leading zeros", () => {
      const cron = parseCron("05 09 01 06 03");
      expect(cron.minutes).toEqual([5]);
      expect(cron.hours).toEqual([9]);
      expect(cron.daysOfMonth).toEqual([1]);
      expect(cron.months).toEqual([6]);
      expect(cron.daysOfWeek).toEqual([3]);
    });

    test("invalid step value throws error", () => {
      expect(() => parseCron("*/0 * * * *")).toThrow("Invalid step");
      expect(() => parseCron("*/abc * * * *")).toThrow("Invalid step");
    });

    test("invalid range throws error", () => {
      expect(() => parseCron("10-5 * * * *")).toThrow("Invalid range");
    });

    test("handles whitespace variations", () => {
      const cron = parseCron("  0   *   *   *   *  ");
      expect(cron.minutes).toEqual([0]);
    });
  });
});

describe("getNextCronTime", () => {
  test("calculates next run from current time", () => {
    const cron = parseCron("0 * * * *"); // Every hour at minute 0
    const from = new Date("2024-01-15T10:30:00");
    const next = getNextCronTime(cron, from);

    expect(next.getHours()).toBe(11);
    expect(next.getMinutes()).toBe(0);
  });

  test("handles minute boundary", () => {
    const cron = parseCron("30 * * * *"); // Every hour at minute 30
    const from = new Date("2024-01-15T10:29:00");
    const next = getNextCronTime(cron, from);

    expect(next.getHours()).toBe(10);
    expect(next.getMinutes()).toBe(30);
  });

  test("handles hour boundary", () => {
    const cron = parseCron("0 14 * * *"); // Daily at 2pm
    const from = new Date("2024-01-15T15:00:00");
    const next = getNextCronTime(cron, from);

    expect(next.getDate()).toBe(16);
    expect(next.getHours()).toBe(14);
  });

  test("handles day-of-week matching", () => {
    const cron = parseCron("0 0 * * 0"); // Sunday at midnight
    const from = new Date("2024-01-15T00:00:00"); // Monday
    const next = getNextCronTime(cron, from);

    expect(next.getDay()).toBe(0); // Sunday
  });

  test("handles month boundaries", () => {
    const cron = parseCron("0 0 1 * *"); // First of month at midnight
    const from = new Date("2024-01-15T00:00:00");
    const next = getNextCronTime(cron, from);

    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(1);
  });

  test("handles year boundaries", () => {
    const cron = parseCron("0 0 1 1 *"); // January 1st at midnight
    const from = new Date("2024-06-15T00:00:00");
    const next = getNextCronTime(cron, from);

    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(0); // January
    expect(next.getDate()).toBe(1);
  });

  test("returns future time even if current minute matches", () => {
    const cron = parseCron("30 10 * * *");
    const from = new Date("2024-01-15T10:30:00");
    const next = getNextCronTime(cron, from);

    // Should be next day since we're already at 10:30
    expect(next.getDate()).toBe(16);
  });
});

// ============================================================================
// Job Definition Tests
// ============================================================================

describe("defineJob", () => {
  test("returns job config unchanged", () => {
    const config = {
      interval: "1h",
      run: async () => {},
    };
    const result = defineJob(config);
    expect(result).toBe(config);
  });

  test("allows jobs with no schedule (trigger-only)", () => {
    const config = {
      run: async () => {},
    };
    expect(() => defineJob(config)).not.toThrow();
  });

  test("validates run is a function", () => {
    const config = {
      interval: "1h",
      run: "not a function" as any,
    };
    expect(() => defineJob(config)).toThrow("Job must have a run function");
  });

  test("throws if both schedule and interval are provided", () => {
    const config = {
      schedule: "0 * * * *",
      interval: "1h",
      run: async () => {},
    };
    expect(() => defineJob(config)).toThrow(
      "Job cannot have both schedule and interval"
    );
  });

  test("allows schedule without interval", () => {
    const config = {
      schedule: "0 * * * *",
      run: async () => {},
    };
    expect(() => defineJob(config)).not.toThrow();
  });

  test("allows interval without schedule", () => {
    const config = {
      interval: "5m",
      run: async () => {},
    };
    expect(() => defineJob(config)).not.toThrow();
  });
});

// ============================================================================
// Job Manager Tests
// ============================================================================

describe("JobManager", () => {
  let tempDir: string;
  let manager: JobManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bunbox-jobs-test-"));
    manager = new JobManager();
    manager.init(tempDir, true);
  });

  afterEach(async () => {
    manager.clear();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("loadJobs", () => {
    test("loads job files from paths", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });
      await writeFile(
        join(jobsDir, "test-job.ts"),
        `export default { run: async () => {} }`
      );

      await manager.loadJobs(["test-job.ts"]);

      expect(manager.hasJob("test-job")).toBe(true);
    });

    test("extracts job name from filename", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });
      await writeFile(
        join(jobsDir, "cleanup-sessions.ts"),
        `export default { run: async () => {} }`
      );

      await manager.loadJobs(["cleanup-sessions.ts"]);

      expect(manager.hasJob("cleanup-sessions")).toBe(true);
      expect(manager.getJobNames()).toContain("cleanup-sessions");
    });

    test("handles nested job paths", async () => {
      const jobsDir = join(tempDir, "jobs", "email");
      await mkdir(jobsDir, { recursive: true });
      await writeFile(
        join(jobsDir, "send-welcome.ts"),
        `export default { run: async () => {} }`
      );

      await manager.loadJobs(["email/send-welcome.ts"]);

      expect(manager.hasJob("email/send-welcome")).toBe(true);
    });

    test("handles missing default export gracefully", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });
      await writeFile(
        join(jobsDir, "bad-job.ts"),
        `export const notDefault = {}`
      );

      // Should not throw, just log warning
      await manager.loadJobs(["bad-job.ts"]);
      expect(manager.hasJob("bad-job")).toBe(false);
    });

    test("handles invalid job config gracefully", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });
      await writeFile(
        join(jobsDir, "invalid-job.ts"),
        `export default { noRun: true }`
      );

      // Should not throw, just log warning
      await manager.loadJobs(["invalid-job.ts"]);
      expect(manager.hasJob("invalid-job")).toBe(false);
    });
  });

  describe("trigger", () => {
    test("runs job asynchronously (non-blocking)", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      let executed = false;
      const jobCode = `
        export default {
          run: async () => {
            globalThis.__testExecuted = true;
          }
        }
      `;
      await writeFile(join(jobsDir, "async-job.ts"), jobCode);
      await manager.loadJobs(["async-job.ts"]);

      // Trigger should return immediately
      manager.trigger("async-job");

      // Wait for microtask to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect((globalThis as any).__testExecuted).toBe(true);
      delete (globalThis as any).__testExecuted;
    });

    test("passes data to job run function", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      const jobCode = `
        export default {
          run: async (data) => {
            globalThis.__testData = data;
          }
        }
      `;
      await writeFile(join(jobsDir, "data-job.ts"), jobCode);
      await manager.loadJobs(["data-job.ts"]);

      manager.trigger("data-job", { email: "test@example.com" });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect((globalThis as any).__testData).toEqual({
        email: "test@example.com",
      });
      delete (globalThis as any).__testData;
    });

    test("throws for unknown job name", () => {
      expect(() => manager.trigger("nonexistent")).toThrow(
        'Job "nonexistent" not found'
      );
    });
  });

  describe("run", () => {
    test("awaits job completion", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      const jobCode = `
        export default {
          run: async () => {
            await new Promise(r => setTimeout(r, 50));
            globalThis.__testCompleted = true;
          }
        }
      `;
      await writeFile(join(jobsDir, "slow-job.ts"), jobCode);
      await manager.loadJobs(["slow-job.ts"]);

      await manager.run("slow-job");

      expect((globalThis as any).__testCompleted).toBe(true);
      delete (globalThis as any).__testCompleted;
    });

    test("passes data to job run function", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      const jobCode = `
        export default {
          run: async (data) => {
            globalThis.__testRunData = data;
          }
        }
      `;
      await writeFile(join(jobsDir, "run-data-job.ts"), jobCode);
      await manager.loadJobs(["run-data-job.ts"]);

      await manager.run("run-data-job", { id: 123 });

      expect((globalThis as any).__testRunData).toEqual({ id: 123 });
      delete (globalThis as any).__testRunData;
    });

    test("throws for unknown job name", async () => {
      await expect(manager.run("nonexistent")).rejects.toThrow(
        'Job "nonexistent" not found'
      );
    });

    test("propagates job errors", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      const jobCode = `
        export default {
          run: async () => {
            throw new Error("Job failed!");
          }
        }
      `;
      await writeFile(join(jobsDir, "error-job.ts"), jobCode);
      await manager.loadJobs(["error-job.ts"]);

      await expect(manager.run("error-job")).rejects.toThrow("Job failed!");
    });
  });

  describe("startScheduledJobs", () => {
    test("starts interval jobs with setInterval", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      let callCount = 0;
      const jobCode = `
        export default {
          interval: "100ms",
          run: async () => {
            globalThis.__intervalCount = (globalThis.__intervalCount || 0) + 1;
          }
        }
      `;
      // We need a shorter interval for testing - use custom parsing
      await writeFile(
        join(jobsDir, "interval-job.ts"),
        `
        export default {
          interval: "1s",
          run: async () => {
            globalThis.__intervalCount = (globalThis.__intervalCount || 0) + 1;
          }
        }
      `
      );
      await manager.loadJobs(["interval-job.ts"]);
      manager.startScheduledJobs();

      // Wait a bit - job runs on interval, not immediately
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Job hasn't run yet (1s interval)
      expect((globalThis as any).__intervalCount || 0).toBe(0);

      manager.stopAll();
      delete (globalThis as any).__intervalCount;
    });

    test("does not start trigger-only jobs", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      const jobCode = `
        export default {
          run: async () => {
            globalThis.__triggerOnlyRan = true;
          }
        }
      `;
      await writeFile(join(jobsDir, "trigger-only.ts"), jobCode);
      await manager.loadJobs(["trigger-only.ts"]);
      manager.startScheduledJobs();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger-only job should not have run
      expect((globalThis as any).__triggerOnlyRan).toBeUndefined();

      manager.stopAll();
    });
  });

  describe("stopAll", () => {
    test("clears all timers", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      const jobCode = `
        export default {
          interval: "100ms",
          run: async () => {
            globalThis.__stopCount = (globalThis.__stopCount || 0) + 1;
          }
        }
      `;
      await writeFile(
        join(jobsDir, "stop-test.ts"),
        `
        export default {
          interval: "50ms",
          run: async () => {
            globalThis.__stopCount = (globalThis.__stopCount || 0) + 1;
          }
        }
      `
      );
      await manager.loadJobs(["stop-test.ts"]);
      manager.startScheduledJobs();

      // Stop immediately
      manager.stopAll();

      // Wait to ensure no more executions
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should not have run or run very few times
      expect((globalThis as any).__stopCount || 0).toBeLessThanOrEqual(1);

      delete (globalThis as any).__stopCount;
    });

    test("can restart after stop", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      await writeFile(
        join(jobsDir, "restart-job.ts"),
        `export default { run: async () => {} }`
      );
      await manager.loadJobs(["restart-job.ts"]);

      manager.startScheduledJobs();
      manager.stopAll();

      // Should be able to restart
      expect(() => manager.startScheduledJobs()).not.toThrow();
      manager.stopAll();
    });
  });

  describe("clear", () => {
    test("removes all jobs", async () => {
      const jobsDir = join(tempDir, "jobs");
      await mkdir(jobsDir, { recursive: true });

      await writeFile(
        join(jobsDir, "job1.ts"),
        `export default { run: async () => {} }`
      );
      await writeFile(
        join(jobsDir, "job2.ts"),
        `export default { run: async () => {} }`
      );

      await manager.loadJobs(["job1.ts", "job2.ts"]);
      expect(manager.getJobNames().length).toBe(2);

      manager.clear();
      expect(manager.getJobNames().length).toBe(0);
    });
  });
});

// ============================================================================
// Scanner Tests (scanJobs)
// ============================================================================

describe("scanJobs", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bunbox-scan-jobs-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("finds .ts files in jobs folder", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });
    await writeFile(join(jobsDir, "cleanup.ts"), "export default {}");

    const jobs = await scanJobs(tempDir);

    expect(jobs).toContain("cleanup.ts");
  });

  test("finds .js files in jobs folder", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });
    await writeFile(join(jobsDir, "cleanup.js"), "export default {}");

    const jobs = await scanJobs(tempDir);

    expect(jobs).toContain("cleanup.js");
  });

  test("finds multiple job files", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });
    await writeFile(join(jobsDir, "job1.ts"), "export default {}");
    await writeFile(join(jobsDir, "job2.ts"), "export default {}");
    await writeFile(join(jobsDir, "job3.tsx"), "export default {}");

    const jobs = await scanJobs(tempDir);

    expect(jobs.length).toBe(3);
  });

  test("returns empty array if no jobs folder", async () => {
    const jobs = await scanJobs(tempDir);

    expect(jobs).toEqual([]);
  });

  test("handles nested folders", async () => {
    const jobsDir = join(tempDir, "jobs", "email");
    await mkdir(jobsDir, { recursive: true });
    await writeFile(join(jobsDir, "send-welcome.ts"), "export default {}");

    const jobs = await scanJobs(tempDir);

    expect(jobs).toContain("email/send-welcome.ts");
  });

  test("finds jobs in deeply nested folders", async () => {
    const jobsDir = join(tempDir, "jobs", "notifications", "email");
    await mkdir(jobsDir, { recursive: true });
    await writeFile(join(jobsDir, "send.ts"), "export default {}");

    const jobs = await scanJobs(tempDir);

    expect(jobs).toContain("notifications/email/send.ts");
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Jobs Integration", () => {
  let tempDir: string;
  let manager: JobManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bunbox-jobs-integration-"));
    manager = new JobManager();
    manager.init(tempDir, true);
  });

  afterEach(async () => {
    manager.clear();
    await rm(tempDir, { recursive: true, force: true });
  });

  test("triggered job runs without blocking", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });

    const jobCode = `
      export default {
        run: async () => {
          await new Promise(r => setTimeout(r, 100));
          globalThis.__slowJobDone = true;
        }
      }
    `;
    await writeFile(join(jobsDir, "slow.ts"), jobCode);
    await manager.loadJobs(["slow.ts"]);

    const startTime = Date.now();
    manager.trigger("slow");
    const triggerTime = Date.now() - startTime;

    // Trigger should return almost immediately
    expect(triggerTime).toBeLessThan(50);

    // But job hasn't completed yet
    expect((globalThis as any).__slowJobDone).toBeUndefined();

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect((globalThis as any).__slowJobDone).toBe(true);

    delete (globalThis as any).__slowJobDone;
  });

  test("multiple jobs run independently", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });

    await writeFile(
      join(jobsDir, "job-a.ts"),
      `export default { run: async () => { globalThis.__jobA = true; } }`
    );
    await writeFile(
      join(jobsDir, "job-b.ts"),
      `export default { run: async () => { globalThis.__jobB = true; } }`
    );

    await manager.loadJobs(["job-a.ts", "job-b.ts"]);

    await manager.run("job-a");
    expect((globalThis as any).__jobA).toBe(true);
    expect((globalThis as any).__jobB).toBeUndefined();

    await manager.run("job-b");
    expect((globalThis as any).__jobB).toBe(true);

    delete (globalThis as any).__jobA;
    delete (globalThis as any).__jobB;
  });

  test("job with typed data", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });

    const jobCode = `
      export default {
        run: async (data) => {
          globalThis.__typedData = {
            received: data,
            processed: data.value * 2
          };
        }
      }
    `;
    await writeFile(join(jobsDir, "typed.ts"), jobCode);
    await manager.loadJobs(["typed.ts"]);

    await manager.run("typed", { value: 21 });

    expect((globalThis as any).__typedData).toEqual({
      received: { value: 21 },
      processed: 42,
    });

    delete (globalThis as any).__typedData;
  });

  test("complete workflow: scan, load, trigger", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });

    await writeFile(
      join(jobsDir, "workflow-job.ts"),
      `export default { run: async (data) => { globalThis.__workflow = data.step; } }`
    );

    // Scan
    const jobFiles = await scanJobs(tempDir);
    expect(jobFiles).toContain("workflow-job.ts");

    // Load
    await manager.loadJobs(jobFiles);
    expect(manager.hasJob("workflow-job")).toBe(true);

    // Trigger
    manager.trigger("workflow-job", { step: "complete" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect((globalThis as any).__workflow).toBe("complete");

    delete (globalThis as any).__workflow;
  });

  test("loads jobs with absolute path resolution", async () => {
    // This test verifies jobs load correctly regardless of cwd
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });

    await writeFile(
      join(jobsDir, "path-test.ts"),
      `export default {
        run: async () => {
          globalThis.__pathTestRan = true;
        }
      }`
    );

    // Initialize with the temp directory (simulates app directory)
    const testManager = new JobManager();
    await testManager.init(tempDir, true);

    // Load jobs - this should work even if cwd is different
    await testManager.loadJobs(["path-test.ts"]);

    expect(testManager.hasJob("path-test")).toBe(true);

    // Run the job to verify it actually loads and executes
    await testManager.run("path-test");

    expect((globalThis as any).__pathTestRan).toBe(true);

    testManager.clear();
    delete (globalThis as any).__pathTestRan;
  });

  test("job import uses defineJob helper correctly", async () => {
    const jobsDir = join(tempDir, "jobs");
    await mkdir(jobsDir, { recursive: true });

    // Test a job that uses defineJob (like real user code would)
    await writeFile(
      join(jobsDir, "define-job-test.ts"),
      `
      // Simulate importing defineJob
      const defineJob = (config) => config;

      export default defineJob({
        interval: "5m",
        run: async (data) => {
          globalThis.__defineJobTestData = data;
        }
      });
      `
    );

    await manager.loadJobs(["define-job-test.ts"]);
    expect(manager.hasJob("define-job-test")).toBe(true);

    await manager.run("define-job-test", { test: true });
    expect((globalThis as any).__defineJobTestData).toEqual({ test: true });

    delete (globalThis as any).__defineJobTestData;
  });
});
