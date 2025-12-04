---
title: Jobs
description: Scheduled and triggered background jobs
order: 17
category: Advanced
---

## Overview

Jobs in Bunbox are discrete background tasks that can run on a schedule or be triggered programmatically. Create job files in the `app/jobs/` directory.

## Creating a Job

Create `app/jobs/cleanup-sessions.ts`:

```typescript
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  schedule: "0 3 * * *", // Daily at 3am
  async run() {
    await db.sessions.deleteExpired();
    console.log("Cleaned up expired sessions");
  },
});
```

## Job Types

### Scheduled Jobs (Cron)

Use cron syntax for precise scheduling:

```typescript
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  schedule: "0 * * * *", // Every hour at minute 0
  async run() {
    await generateHourlyReport();
  },
});
```

**Cron Format:** `minute hour day-of-month month day-of-week`

| Pattern | Description |
|---------|-------------|
| `0 * * * *` | Every hour at minute 0 |
| `*/15 * * * *` | Every 15 minutes |
| `0 3 * * *` | Daily at 3am |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 9 1 * *` | Monthly on the 1st at 9am |
| `30 4 1,15 * *` | 1st and 15th of month at 4:30am |

### Scheduled Jobs (Interval)

Use simple intervals for recurring tasks:

```typescript
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  interval: "5m", // Every 5 minutes
  async run() {
    await checkHealthStatus();
  },
});
```

**Interval Format:** Number followed by unit

| Unit | Example |
|------|---------|
| `s` | `30s` (30 seconds) |
| `m` | `5m` (5 minutes) |
| `h` | `1h` (1 hour) |
| `d` | `1d` (1 day) |

Combine units: `1h30m` (1 hour 30 minutes)

### Trigger-Only Jobs

Jobs without a schedule are triggered from your code:

```typescript
// app/jobs/send-welcome-email.ts
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  async run(data: { email: string; name: string }) {
    await sendEmail(data.email, `Welcome, ${data.name}!`);
  },
});
```

## Triggering Jobs

### Fire and Forget

Trigger a job asynchronously (non-blocking):

```typescript
import { jobs } from "@ademattos/bunbox";

// In an API route
export async function POST(req) {
  const user = await createUser(req.body);

  // Trigger job - returns immediately
  jobs.trigger("send-welcome-email", {
    email: user.email,
    name: user.name,
  });

  return json({ user });
}
```

### Await Completion

Run a job and wait for it to finish:

```typescript
import { jobs } from "@ademattos/bunbox";

export async function POST(req) {
  // Wait for job to complete
  await jobs.run("process-payment", {
    orderId: req.body.orderId,
  });

  return json({ status: "processed" });
}
```

## File Structure

```
app/
├── jobs/
│   ├── cleanup-sessions.ts      # Scheduled cleanup
│   ├── send-welcome-email.ts    # Triggered on signup
│   ├── daily-report.ts          # Daily scheduled
│   └── notifications/
│       └── send-push.ts         # Nested job
├── api/
│   └── users/route.ts
└── page.tsx
```

Job names are derived from file paths:
- `cleanup-sessions.ts` → `"cleanup-sessions"`
- `notifications/send-push.ts` → `"notifications/send-push"`

## Examples

### Database Cleanup

```typescript
// app/jobs/cleanup-expired-tokens.ts
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  schedule: "0 4 * * *", // 4am daily
  async run() {
    const deleted = await db.tokens.deleteMany({
      expiresAt: { lt: new Date() },
    });
    console.log(`Deleted ${deleted.count} expired tokens`);
  },
});
```

### Email Notifications

```typescript
// app/jobs/send-notification.ts
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  async run(data: { userId: string; message: string }) {
    const user = await db.users.findUnique({ where: { id: data.userId } });
    if (user?.email) {
      await sendEmail(user.email, "Notification", data.message);
    }
  },
});
```

Trigger from your API:

```typescript
// app/api/orders/route.ts
import { jobs, json } from "@ademattos/bunbox";

export async function POST(req) {
  const order = await createOrder(req.body);

  jobs.trigger("send-notification", {
    userId: order.userId,
    message: `Order #${order.id} confirmed!`,
  });

  return json({ order });
}
```

### Health Checks

```typescript
// app/jobs/health-check.ts
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  interval: "1m",
  async run() {
    const services = await checkAllServices();
    if (!services.allHealthy) {
      await alertOps(services.failures);
    }
  },
});
```

### Data Sync

```typescript
// app/jobs/sync-external-data.ts
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  interval: "30m",
  async run() {
    const data = await fetchExternalAPI();
    await db.externalData.upsertMany(data);
  },
});
```

## Error Handling

Errors in jobs are logged but don't crash the server:

```typescript
import { defineJob } from "@ademattos/bunbox";

export default defineJob({
  interval: "5m",
  async run() {
    try {
      await riskyOperation();
    } catch (error) {
      console.error("Job failed:", error);
      await notifyAdmin(error);
    }
  },
});
```

For `jobs.run()`, errors are propagated:

```typescript
try {
  await jobs.run("risky-job", data);
} catch (error) {
  // Handle job failure
}
```

For `jobs.trigger()`, errors are logged but not thrown.

## Jobs vs Workers

Bunbox has both jobs and workers for different use cases:

| Feature | Jobs (`/jobs`) | Workers (`worker.ts`) |
|---------|---------------|----------------------|
| Purpose | Discrete tasks | Long-running processes |
| Scheduling | Built-in cron/interval | Manual (`setInterval`) |
| Triggering | `jobs.trigger()` / `jobs.run()` | N/A |
| Multiple files | Yes | Single file |
| Use case | Cleanup, emails, reports | Socket clients, persistent connections |

**Use Jobs when:**
- Task has a clear start and end
- Need to trigger from other code
- Want built-in scheduling

**Use Workers when:**
- Process runs continuously
- Managing persistent connections
- Need custom lifecycle control

## Development

In development mode:
- Jobs hot reload on file changes
- Job schedules restart after reload
- Console logs show job activity

```
[bunbox] Loaded job: cleanup-sessions (schedule: 0 3 * * *)
[bunbox] Loaded job: health-check (interval: 1m)
[bunbox] Started interval job: health-check (every 1m)
```

## Architecture

Jobs run on the same event loop as the HTTP server:
- No thread overhead
- Shared database connections
- Non-blocking async I/O

For CPU-intensive work, consider chunking operations or using Bun Worker threads directly.
