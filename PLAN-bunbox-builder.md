# Bunbox App Builder - Implementation Plan

A v0-like agent application that allows users to create bunbox apps through natural language conversation.

## Overview

**What it is:** An open-source, self-hostable AI agent that understands bunbox deeply and can create full bunbox applications by chatting with users.

**Key Features:**
- Chat-based interface for app creation
- Agent has full file system access to create apps locally or on server
- Session persistence with Bun SQLite
- Streaming responses for real-time feedback
- Project management (create, list, delete projects)
- Built entirely with bunbox (dogfooding)

## Architecture

```
apps/bunbox-builder/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with theme
│   ├── chat/
│   │   └── page.tsx                # Main chat interface
│   ├── projects/
│   │   └── page.tsx                # List user's projects
│   ├── project/
│   │   └── [id]/
│   │       └── page.tsx            # View/manage single project
│   └── api/
│       ├── chat/
│       │   └── route.ts            # Chat streaming endpoint
│       ├── sessions/
│       │   └── route.ts            # Session management
│       └── projects/
│           ├── route.ts            # List/create projects
│           └── [id]/
│               └── route.ts        # Get/delete project
├── lib/
│   ├── agent/
│   │   ├── client.ts               # Agent SDK wrapper
│   │   ├── prompt.ts               # System prompt with bunbox knowledge
│   │   └── tools.ts                # Custom MCP tools if needed
│   ├── db/
│   │   ├── index.ts                # Database initialization
│   │   ├── schema.ts               # SQLite schema
│   │   └── queries.ts              # Database queries
│   └── utils/
│       └── project-manager.ts      # Project file operations
├── public/
│   └── ...                         # Static assets
├── bunbox.config.ts
└── package.json
```

## Database Schema (Bun SQLite)

```sql
-- Sessions table for agent conversations
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages table for conversation history
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'tool'
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_input TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table for created apps
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL, -- File system path
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### POST /api/chat
Stream chat responses from the agent.

**Request:**
```typescript
{
  message: string;
  sessionId?: string;    // Continue existing session
  projectId?: string;    // Associate with project
}
```

**Response:** Server-Sent Events (SSE) stream
```typescript
// Event types:
{ type: "text", content: string }
{ type: "tool_use", tool: string, input: object }
{ type: "tool_result", result: object }
{ type: "done", sessionId: string }
{ type: "error", message: string }
```

### GET /api/sessions
List all sessions.

### GET /api/sessions/:id
Get session with messages.

### DELETE /api/sessions/:id
Delete a session.

### GET /api/projects
List all projects.

### POST /api/projects
Create a new project (manual creation).

### GET /api/projects/:id
Get project details.

### DELETE /api/projects/:id
Delete project (and optionally files).

## Agent Configuration

### System Prompt (lib/agent/prompt.ts)

The agent needs comprehensive knowledge of bunbox. The prompt should include:

```markdown
# Bunbox Expert Agent

You are an expert bunbox developer. Your role is to help users create full-stack TypeScript applications using the bunbox framework.

## What is Bunbox?

Bunbox is a minimal full-stack TypeScript framework built on Bun. It combines:
- File-based routing (like Next.js)
- Type-safe APIs with auto-generated clients (like tRPC)
- Real-time WebSockets (like Socket.io)
- SSR with client hydration

## Project Structure

Every bunbox project follows this structure:
```
my-app/
├── app/
│   ├── page.tsx              # Home page (/)
│   ├── layout.tsx            # Root layout
│   ├── middleware.ts         # Page middleware (auth, etc.)
│   ├── api/
│   │   └── [name]/
│   │       └── route.ts      # API endpoints
│   ├── sockets/              # Type-safe socket routes
│   └── ws/                   # Raw WebSocket routes
├── public/                   # Static files
├── bunbox.config.ts          # Configuration
└── package.json
```

## Creating Pages

Pages are React components in `page.tsx` files:

```typescript
// app/page.tsx - Home page
export default function HomePage() {
  return <h1>Welcome</h1>;
}

// With server-side data loading
export async function loader({ params, query }) {
  const data = await fetchData();
  return { data };
}

export default function Page({ data }) {
  return <div>{data.title}</div>;
}

// With metadata
export const metadata = {
  title: "Page Title",
  description: "Page description"
};
```

## Creating API Routes

API routes use the fluent route builder:

```typescript
// app/api/users/route.ts
import { route } from "@ademattos/bunbox";
import { z } from "zod";

// GET /api/users
export const listUsers = route
  .get()
  .query(z.object({ role: z.string().optional() }))
  .handle(async ({ query }) => {
    return { users: await db.getUsers(query.role) };
  });

// POST /api/users
export const createUser = route
  .post()
  .body(z.object({
    name: z.string(),
    email: z.string().email()
  }))
  .handle(async ({ body }) => {
    const user = await db.createUser(body);
    return { user };
  });
```

## Layouts

Layouts wrap pages with shared UI:

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>...</nav>
        {children}
      </body>
    </html>
  );
}
```

## Middleware (Page Protection)

```typescript
// app/middleware.ts
import { redirect, getCookie } from "@ademattos/bunbox";

export async function middleware({ request }) {
  const token = getCookie(request, "auth_token");
  if (!token) return redirect("/login");
  return { user: await verifyToken(token) };
}
```

## API Middleware

```typescript
import { route, defineMiddleware, error } from "@ademattos/bunbox";

const auth = defineMiddleware(async (ctx) => {
  const token = ctx.headers.get("authorization");
  if (!token) return error("Unauthorized", 401);
  return { user: await verifyToken(token) };
});

export const getProfile = route
  .get()
  .use(auth)
  .handle(({ user }) => ({ user }));
```

## WebSockets (Type-Safe)

```typescript
// app/sockets/chat/protocol.ts
import { defineProtocol } from "@ademattos/bunbox";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
});

// app/sockets/chat/route.ts
import { ChatProtocol } from "./protocol";

export function onJoin(user, ctx) {
  ctx.broadcast("user-joined", { username: user.username });
}

export function onMessage(user, message, ctx) {
  if (message.type === "chat-message") {
    ctx.broadcast("chat-message", message.data);
  }
}
```

## Client-Side API Usage

Bunbox auto-generates a typed API client:

```typescript
import { api } from "@/.bunbox/api-client";

// Fetch data
const users = await api.users.listUsers({ role: "admin" });

// With React hook
const { data, loading, error } = api.users.listUsers.useQuery({ role: "admin" });

// Streaming
const { data, latest } = api.stream.generate.useStream();
```

## Configuration

```typescript
// bunbox.config.ts
import { defineConfig } from "@ademattos/bunbox";

export default defineConfig({
  port: 3000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
```

## Best Practices

1. Use Zod schemas for all API validation
2. Keep pages simple - put logic in loaders
3. Use middleware for auth, not in individual handlers
4. Prefer typed sockets over raw WebSockets
5. Keep API routes focused - one responsibility each
6. Use layouts for shared UI across routes

## Creating a New Bunbox App

To create a new app:
1. Create the project directory
2. Initialize package.json with bunbox dependency
3. Create bunbox.config.ts
4. Create app/ directory with pages and APIs
5. Run with `bun run dev`

When users ask you to build something:
1. Understand their requirements fully
2. Plan the file structure
3. Create files one by one using the tools available
4. Test by reading back the files
5. Explain what you created

You have access to file system tools. Use them to create, read, and modify files.
```

### Agent SDK Integration (lib/agent/client.ts)

```typescript
import { ClaudeSDKClient, ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";
import { BUNBOX_SYSTEM_PROMPT } from "./prompt";

export interface AgentOptions {
  workingDirectory: string;
  sessionId?: string;
}

export async function createAgent(options: AgentOptions) {
  const agentOptions: ClaudeAgentOptions = {
    system_prompt: BUNBOX_SYSTEM_PROMPT,
    allowed_tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    max_turns: 50,
    working_directory: options.workingDirectory,
    permission_mode: "bypassPermissions"
  };

  const client = new ClaudeSDKClient({ options: agentOptions });
  return client;
}

export async function* streamAgentResponse(
  client: ClaudeSDKClient,
  message: string
) {
  await client.query(message);

  for await (const response of client.receive_response()) {
    yield {
      type: response.type,
      content: response.content
    };
  }
}
```

## Frontend Components

### Chat Interface (app/chat/page.tsx)

```typescript
"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, sessionId })
    });

    const reader = response.body?.getReader();
    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      const events = text.split("\n\n").filter(Boolean);

      for (const event of events) {
        const data = JSON.parse(event.replace("data: ", ""));

        if (data.type === "text") {
          assistantContent += data.content;
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.findIndex(m => m.id === assistantId);
            if (lastIdx >= 0) {
              updated[lastIdx].content = assistantContent;
            } else {
              updated.push({ id: assistantId, role: "assistant", content: assistantContent });
            }
            return updated;
          });
        } else if (data.type === "done") {
          setSessionId(data.sessionId);
        }
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Describe your app..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading}>
          Send
        </button>
      </div>
    </div>
  );
}
```

## Implementation Steps

### Phase 1: Project Setup
1. Create `apps/bunbox-builder/` directory
2. Initialize package.json with dependencies
3. Create bunbox.config.ts
4. Set up basic layout and landing page

### Phase 2: Database Layer
1. Create SQLite database with Bun
2. Implement schema (sessions, messages, projects)
3. Create query helpers

### Phase 3: Agent Integration
1. Install @anthropic-ai/claude-agent-sdk
2. Create agent client wrapper
3. Write comprehensive bunbox system prompt
4. Test agent locally

### Phase 4: API Routes
1. Implement /api/chat with SSE streaming
2. Implement /api/sessions CRUD
3. Implement /api/projects CRUD
4. Add error handling and validation

### Phase 5: Frontend
1. Build chat interface with streaming support
2. Build projects list page
3. Build project detail page
4. Add navigation and styling

### Phase 6: Polish
1. Add loading states and error handling
2. Improve UI/UX
3. Add project preview/download functionality
4. Write documentation

## Dependencies

```json
{
  "dependencies": {
    "@ademattos/bunbox": "workspace:*",
    "@anthropic-ai/claude-agent-sdk": "latest",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

## Environment Variables

```bash
# .env
ANTHROPIC_API_KEY=your-api-key
PROJECTS_DIR=/path/to/projects  # Where generated apps are created
DATABASE_PATH=./data/bunbox-builder.db
```

## Security Considerations

1. **Sandboxing**: Consider running agent in a container for production
2. **File System Access**: Limit to specific directories only
3. **Rate Limiting**: Add rate limits to prevent abuse
4. **API Key Protection**: Never expose API key to client
5. **Input Validation**: Sanitize all user inputs
6. **Command Injection**: Be careful with Bash tool access

## Deployment

For self-hosting:
1. Clone the repository
2. Install dependencies: `bun install`
3. Set environment variables
4. Build: `bun run build`
5. Start: `bun run start`

Can be deployed to any server that supports Bun (Node.js 18+ also works with minor adjustments).

## Future Enhancements

- [ ] Project templates (starter apps)
- [ ] Live preview of created apps
- [ ] Git integration (auto-commit changes)
- [ ] Collaboration features
- [ ] App deployment integration
- [ ] Custom components library
- [ ] AI-generated tests
