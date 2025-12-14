import { BUNBOX_SYSTEM_PROMPT } from "./prompt";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PROJECTS_DIR = process.env.PROJECTS_DIR || "./projects";

if (!ANTHROPIC_API_KEY) {
  console.warn("Warning: ANTHROPIC_API_KEY not set. Agent will not work.");
}

export interface AgentMessage {
  type: "text" | "tool_use" | "tool_result" | "error" | "done";
  content?: string;
  tool?: string;
  input?: unknown;
  result?: unknown;
  sessionId?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
}

// Tools available to the agent
const TOOLS = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to read"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "write_file",
    description: "Write content to a file at the given path. Creates the file if it doesn't exist, or overwrites if it does.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to write to"
        },
        content: {
          type: "string",
          description: "The content to write to the file"
        }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "list_directory",
    description: "List files and directories at the given path",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to list"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "create_directory",
    description: "Create a directory at the given path (including parent directories)",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to create"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "delete_file",
    description: "Delete a file at the given path",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to delete"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "run_command",
    description: "Run a shell command in the project directory. Use for installing dependencies, running builds, etc.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to run"
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (relative to projects dir)"
        }
      },
      required: ["command"]
    }
  }
];

// Execute a tool call
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  projectPath: string
): Promise<string> {
  const resolvePath = (p: string) => {
    // Ensure path is within project directory
    const resolved = Bun.resolveSync(p, projectPath);
    if (!resolved.startsWith(Bun.resolveSync(projectPath, "."))) {
      throw new Error("Path must be within project directory");
    }
    return resolved;
  };

  try {
    switch (name) {
      case "read_file": {
        const path = resolvePath(input.path as string);
        const content = await Bun.file(path).text();
        return content;
      }

      case "write_file": {
        const path = resolvePath(input.path as string);
        const content = input.content as string;
        // Create parent directories if needed
        const dir = path.substring(0, path.lastIndexOf("/"));
        await Bun.spawn(["mkdir", "-p", dir]).exited;
        await Bun.write(path, content);
        return `File written successfully to ${input.path}`;
      }

      case "list_directory": {
        const path = resolvePath(input.path as string);
        const glob = new Bun.Glob("*");
        const entries: string[] = [];
        for await (const entry of glob.scan({ cwd: path })) {
          const stat = await Bun.file(`${path}/${entry}`).exists();
          entries.push(entry);
        }
        return entries.length > 0 ? entries.join("\n") : "(empty directory)";
      }

      case "create_directory": {
        const path = resolvePath(input.path as string);
        await Bun.spawn(["mkdir", "-p", path]).exited;
        return `Directory created: ${input.path}`;
      }

      case "delete_file": {
        const path = resolvePath(input.path as string);
        await Bun.spawn(["rm", "-f", path]).exited;
        return `File deleted: ${input.path}`;
      }

      case "run_command": {
        const command = input.command as string;
        const cwd = input.cwd
          ? resolvePath(input.cwd as string)
          : projectPath;

        const proc = Bun.spawn(["sh", "-c", command], {
          cwd,
          stdout: "pipe",
          stderr: "pipe"
        });

        const [stdout, stderr] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text()
        ]);

        const exitCode = await proc.exited;

        if (exitCode !== 0) {
          return `Command failed (exit ${exitCode}):\nstdout: ${stdout}\nstderr: ${stderr}`;
        }

        return stdout || "(no output)";
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function* streamAgentResponse(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  projectPath: string
): AsyncGenerator<AgentMessage> {
  if (!ANTHROPIC_API_KEY) {
    yield { type: "error", content: "ANTHROPIC_API_KEY not configured" };
    return;
  }

  // Ensure project directory exists
  await Bun.spawn(["mkdir", "-p", projectPath]).exited;

  // Build messages array
  const messages: ConversationMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;

    // Make API request to Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8096,
        system: BUNBOX_SYSTEM_PROMPT,
        tools: TOOLS,
        messages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", content: `API error: ${error}` };
      return;
    }

    const data = await response.json();

    // Process response content blocks
    const assistantContent: ContentBlock[] = [];

    for (const block of data.content) {
      if (block.type === "text") {
        assistantContent.push({ type: "text", text: block.text });
        yield { type: "text", content: block.text };
      } else if (block.type === "tool_use") {
        assistantContent.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input
        });

        yield {
          type: "tool_use",
          tool: block.name,
          input: block.input
        };

        // Execute the tool
        const result = await executeTool(block.name, block.input, projectPath);

        yield {
          type: "tool_result",
          tool: block.name,
          result
        };

        // Add assistant message and tool result to continue conversation
        messages.push({ role: "assistant", content: assistantContent });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              content: result
            }
          ]
        });

        continueLoop = true;
        break; // Process one tool at a time
      }
    }

    // If no tool use, add the final assistant message
    if (!continueLoop && assistantContent.length > 0) {
      messages.push({ role: "assistant", content: assistantContent });
    }
  }

  yield { type: "done" };
}

// Get or create project path
export function getProjectPath(projectName: string): string {
  const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  return `${PROJECTS_DIR}/${safeName}`;
}

// Initialize a new bunbox project
export async function initializeProject(projectPath: string, projectName: string): Promise<void> {
  await Bun.spawn(["mkdir", "-p", projectPath]).exited;

  // Create basic package.json if it doesn't exist
  const packageJsonPath = `${projectPath}/package.json`;
  const exists = await Bun.file(packageJsonPath).exists();

  if (!exists) {
    const packageJson = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "bunbox dev",
        build: "bunbox build",
        start: "bunbox start"
      },
      dependencies: {
        "@ademattos/bunbox": "latest",
        zod: "^3.22.0"
      }
    };

    await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}
