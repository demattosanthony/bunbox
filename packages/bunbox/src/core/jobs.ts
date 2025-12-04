/**
 * Job system for Bunbox
 * Provides scheduled and triggered background jobs
 */

import { join } from "path";
import { resolveAbsolutePath } from "./utils";
import type { JobConfig, JobInstance, JobModule } from "./types";

/**
 * Parse interval string to milliseconds
 * Supports: "30s", "5m", "1h", "1d" or combinations like "1h30m"
 */
export function parseInterval(interval: string): number {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  let total = 0;
  const regex = /(\d+)(s|m|h|d)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(interval)) !== null) {
    const value = parseInt(match[1]!, 10);
    const unit = match[2] as "s" | "m" | "h" | "d";
    total += value * units[unit]!;
  }

  if (total <= 0) {
    throw new Error(`Invalid interval: "${interval}". Use "30s", "5m", "1h", "1d"`);
  }

  return total;
}

/** Parsed cron expression */
interface ParsedCron {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
}

/** Parse a single cron field into array of valid values */
function parseCronField(field: string, min: number, max: number, name: string): number[] {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      // Step: */n or n-m/n
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr!, 10);
      if (isNaN(step) || step <= 0) throw new Error(`Invalid step in ${name}: "${part}"`);

      let start = min, end = max;
      if (range !== "*") {
        if (range!.includes("-")) {
          [start, end] = range!.split("-").map(Number) as [number, number];
        } else {
          start = parseInt(range!, 10);
        }
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (part.includes("-")) {
      // Range: n-m
      const [start, end] = part.split("-").map(Number) as [number, number];
      if (isNaN(start) || isNaN(end)) throw new Error(`Invalid range in ${name}: "${part}"`);
      if (start > end) throw new Error(`Invalid range in ${name}: ${start} > ${end}`);
      for (let i = start; i <= end; i++) values.add(i);
    } else if (part === "*") {
      // Wildcard
      for (let i = min; i <= max; i++) values.add(i);
    } else {
      // Single value
      const value = parseInt(part, 10);
      if (isNaN(value)) throw new Error(`Invalid value in ${name}: "${part}"`);
      if (value < min || value > max) throw new Error(`Out of range in ${name}: ${value}`);
      values.add(value);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

/** Parse cron expression (5-field format: minute hour day month weekday) */
export function parseCron(expression: string): ParsedCron {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Invalid cron: "${expression}". Expected 5 fields`);
  }

  return {
    minutes: parseCronField(fields[0]!, 0, 59, "minute"),
    hours: parseCronField(fields[1]!, 0, 23, "hour"),
    daysOfMonth: parseCronField(fields[2]!, 1, 31, "day"),
    months: parseCronField(fields[3]!, 1, 12, "month"),
    daysOfWeek: parseCronField(fields[4]!, 0, 6, "weekday"),
  };
}

/** Get the next run time for a cron expression */
export function getNextCronTime(cron: ParsedCron, from: Date = new Date()): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Limit to prevent infinite loops (one year of minutes)
  for (let i = 0; i < 366 * 24 * 60; i++) {
    const month = next.getMonth() + 1;
    const day = next.getDate();
    const weekday = next.getDay();
    const hour = next.getHours();
    const minute = next.getMinutes();

    if (!cron.months.includes(month)) {
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(0, 0);
      continue;
    }

    if (!cron.daysOfMonth.includes(day) || !cron.daysOfWeek.includes(weekday)) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0);
      continue;
    }

    if (!cron.hours.includes(hour)) {
      const nextHour = cron.hours.find((h) => h > hour);
      if (nextHour !== undefined) {
        next.setHours(nextHour, cron.minutes[0]!);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(cron.hours[0]!, cron.minutes[0]!);
      }
      continue;
    }

    if (!cron.minutes.includes(minute)) {
      const nextMinute = cron.minutes.find((m) => m > minute);
      if (nextMinute !== undefined) {
        next.setMinutes(nextMinute);
      } else {
        next.setHours(next.getHours() + 1, cron.minutes[0]!);
      }
      continue;
    }

    return next;
  }

  throw new Error("Could not find next cron time within one year");
}

/** Define a job with type-safe configuration */
export function defineJob<T = void>(config: JobConfig<T>): JobConfig<T> {
  if (typeof config.run !== "function") {
    throw new Error("Job must have a run function");
  }
  if (config.schedule && config.interval) {
    throw new Error("Job cannot have both schedule and interval");
  }
  return config;
}

/** Manages job loading, scheduling, and execution */
export class JobManager {
  private jobs = new Map<string, JobInstance>();
  private jobsDir = "";
  private development = false;

  init(appDir: string, development = false): void {
    this.jobsDir = join(appDir, "jobs");
    this.development = development;
  }

  async loadJobs(jobFiles: string[]): Promise<void> {
    for (const file of jobFiles) {
      const name = file.replace(/\.(tsx?|jsx?)$/, "");
      const absolutePath = resolveAbsolutePath(join(this.jobsDir, file));

      try {
        if (this.development) delete require.cache[absolutePath];

        const module = (await import(absolutePath)) as JobModule;
        if (!module.default?.run) {
          console.warn(`[bunbox] Job "${name}" missing default export or run function`);
          continue;
        }

        this.jobs.set(name, { name, config: module.default, path: absolutePath });

        if (this.development) {
          const info = module.default.schedule
            ? `schedule: ${module.default.schedule}`
            : module.default.interval
              ? `interval: ${module.default.interval}`
              : "trigger-only";
          console.log(`[bunbox] Loaded job: ${name} (${info})`);
        }
      } catch (error) {
        console.error(`[bunbox] Failed to load job "${name}":`, error);
      }
    }
  }

  startScheduledJobs(): void {
    for (const [name, job] of this.jobs) {
      if (job.config.interval) {
        const ms = parseInterval(job.config.interval);
        job.timer = setInterval(() => this.executeJob(name), ms);
        if (this.development) {
          console.log(`[bunbox] Started interval job: ${name} (every ${job.config.interval})`);
        }
      } else if (job.config.schedule) {
        this.scheduleCronJob(name, job);
      }
    }
  }

  private scheduleCronJob(name: string, job: JobInstance): void {
    try {
      const cron = parseCron(job.config.schedule!);
      const nextRun = getNextCronTime(cron);
      const delay = nextRun.getTime() - Date.now();

      job.timer = setTimeout(() => {
        this.executeJob(name);
        this.scheduleCronJob(name, job);
      }, delay);

      if (this.development) {
        console.log(`[bunbox] Scheduled cron job: ${name} (next: ${nextRun.toLocaleString()})`);
      }
    } catch (error) {
      console.error(`[bunbox] Failed to schedule cron job "${name}":`, error);
    }
  }

  private async executeJob(name: string, data?: unknown): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job "${name}" not found`);

    try {
      await job.config.run(data);
    } catch (error) {
      console.error(`[bunbox] Job "${name}" failed:`, error);
      throw error;
    }
  }

  trigger<T = unknown>(name: string, data?: T): void {
    if (!this.jobs.has(name)) throw new Error(`Job "${name}" not found`);
    queueMicrotask(() => this.executeJob(name, data).catch(() => {}));
  }

  async run<T = unknown>(name: string, data?: T): Promise<void> {
    return this.executeJob(name, data);
  }

  stopAll(): void {
    for (const job of this.jobs.values()) {
      if (job.timer) {
        clearTimeout(job.timer);
        clearInterval(job.timer);
        job.timer = undefined;
      }
    }
    if (this.development) console.log("[bunbox] Stopped all jobs");
  }

  clear(): void {
    this.stopAll();
    this.jobs.clear();
  }

  getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }

  hasJob(name: string): boolean {
    return this.jobs.has(name);
  }
}

/** Global job manager instance */
export const jobManager = new JobManager();

/** Jobs API for triggering jobs from application code */
export const jobs = {
  trigger: <T = unknown>(name: string, data?: T): void => jobManager.trigger(name, data),
  run: <T = unknown>(name: string, data?: T): Promise<void> => jobManager.run(name, data),
};
