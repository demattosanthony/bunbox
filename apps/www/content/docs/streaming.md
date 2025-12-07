---
title: Streaming
description: Stream data from server to client with streaming responses and Server-Sent Events (SSE)
order: 10.5
category: API Routes
---

## Creating a Streaming Response

Use the `stream()` function to create streaming responses:

```typescript
// app/api/stream/route.ts
import { route, stream, type StreamingResponse } from "@ademattos/bunbox";

export const streamText = route.get().handle((): StreamingResponse<string> => {
  return stream(async function* () {
    const words = ["Hello", " ", "from", " ", "Bunbox"];

    for (const word of words) {
      yield word;
      await Bun.sleep(100);
    }
  });
});
```

## Server-Sent Events (SSE)

For structured data streaming, use `sse()` which automatically formats messages:

```typescript
// app/api/updates/route.ts
import { route, sse, type SSEResponse } from "@ademattos/bunbox";

interface Update {
  message: string;
  progress: number;
}

export const getUpdates = route.get().handle((): SSEResponse<Update> => {
  return sse(async function* () {
    for (let i = 0; i <= 100; i += 10) {
      yield {
        message: `Processing...`,
        progress: i,
      };
      await Bun.sleep(500);
    }
  });
});
```

## Client-Side Usage with useStream

Use the `useStream` hook from the auto-generated API client:

```tsx
"use client";

import { api } from "@/.bunbox/api-client";

export default function StreamPage() {
  const { data, latest, loading, error, start, abort } =
    api.stream.streamText.useStream({
      enabled: false, // Don't start automatically
      onMessage: (msg) => console.log("Received:", msg),
      onFinish: () => console.log("Stream finished"),
      onError: (err) => console.error("Stream error:", err),
    });

  return (
    <div>
      <button onClick={start} disabled={loading}>
        {loading ? "Streaming..." : "Start Stream"}
      </button>

      {loading && <button onClick={abort}>Abort</button>}

      <div>
        {data.map((msg, i) => (
          <span key={i}>{msg.token}</span>
        ))}
      </div>

      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

## Hook Options

The `useStream` hook accepts these options (all flattened):

```typescript
const stream = api.updates.getUpdates.useStream({
  // Auto-start the stream (default: true)
  enabled: true,

  // Callback when each message arrives
  onMessage: (data) => console.log(data),

  // Callback when stream completes
  onFinish: () => console.log("Done"),

  // Callback on error
  onError: (error) => console.error(error),

  // Optional headers
  headers: { "Authorization": "Bearer token" },
});
```

## Hook Return Values

The hook returns:

```typescript
{
  // All received messages
  data: TResponse[],

  // Most recent message
  latest: TResponse | null,

  // Loading state
  loading: boolean,

  // Error if any
  error: Error | undefined,

  // Manually start the stream
  start: () => Promise<void>,

  // Abort ongoing stream
  abort: () => void,
}
```

## Use Cases

### Real-time Progress Updates

```typescript
// Server
export const trackProgress = route.get().handle((): SSEResponse<{ progress: number; status: string }> => {
  return sse(async function* () {
    const steps = ["Initializing", "Processing", "Finalizing", "Complete"];

    for (let i = 0; i < steps.length; i++) {
      yield {
        progress: (i + 1) * 25,
        status: steps[i],
      };
      await Bun.sleep(1000);
    }
  });
});
```

```tsx
// Client
const { data, latest } = api.progress.trackProgress.useStream();

return (
  <div>
    <div>Progress: {latest?.progress}%</div>
    <div>Status: {latest?.status}</div>
  </div>
);
```

### AI Text Generation

```typescript
// Server
export const generateText = route
  .post()
  .body(z.object({ prompt: z.string() }))
  .handle(({ body }): SSEResponse<{ token: string }> => {
    return sse(async function* () {
      const response = await generateAIResponse(body.prompt);

      for await (const chunk of response) {
        yield { token: chunk };
      }
    });
  });
```

```tsx
// Client - body fields are flattened
const { data, loading, start } = api.ai.generateText.useStream({
  enabled: false,
  prompt: "Write a story",  // Flattened, not { body: { prompt } }
});

return (
  <div>
    <button onClick={start}>Generate</button>
    <p>{data.map(d => d.token).join("")}</p>
  </div>
);
```

### Log Streaming

```typescript
// Server
export const streamLogs = route.get().handle((): StreamingResponse<string> => {
  return stream(async function* () {
    const logs = await fetchLogs();

    for (const log of logs) {
      yield `[${log.timestamp}] ${log.message}\n`;
    }
  });
});
```

## Type Safety

Both `stream()` and `sse()` return phantom types that the API client generator recognizes:

```typescript
// Server
export const countStream = route.get().handle((): SSEResponse<{ count: number }> => {
  return sse(async function* () {
    for (let i = 0; i < 10; i++) {
      yield { count: i };
    }
  });
});

// Client - automatically typed!
const { data } = api.counter.countStream.useStream();
// data is typed as Array<{ count: number }>
```

## Manual Streaming (Without Hook)

You can also consume streams manually:

```typescript
const response = await api.stream.streamText();

for await (const message of response) {
  console.log(message);
}
```

## Aborting Streams

Streams can be aborted using the `abort()` function:

```tsx
const { abort, loading } = api.stream.streamText.useStream();

if (loading) {
  return <button onClick={abort}>Cancel</button>;
}
```

## Error Handling

Handle stream errors gracefully:

```tsx
const { error } = api.stream.streamText.useStream({
  onError: (err) => {
    // Log to error service
    console.error(err);
  },
});

if (error) {
  return <div>Failed to load stream: {error.message}</div>;
}
```
