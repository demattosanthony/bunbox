import { route } from "@ademattos/bunbox";
import { z } from "zod";
import {
  streamAgentResponse,
  getProjectPath,
  initializeProject,
  type ConversationMessage
} from "@/lib/agent/client";
import {
  createSession,
  getSession,
  createMessage,
  getSessionMessages,
  createProject,
  linkSessionToProject,
  getProject
} from "@/lib/db";

export const chat = route
  .post()
  .body(
    z.object({
      message: z.string().min(1),
      sessionId: z.string().optional(),
      projectId: z.string().optional(),
      projectName: z.string().optional()
    })
  )
  .handle(async ({ body }) => {
    const { message, sessionId, projectId, projectName } = body;

    // Get or create session
    let session = sessionId ? getSession(sessionId) : null;
    if (!session) {
      session = createSession(projectId);
    }

    // Get or create project
    let project = projectId ? getProject(projectId) : null;
    if (!project && projectName) {
      const projectPath = getProjectPath(projectName);
      await initializeProject(projectPath, projectName);
      project = createProject(projectName, projectPath, `Created via chat`);
      linkSessionToProject(session.id, project.id);
    }

    // Default project path if no project specified
    const projectPath = project?.path || getProjectPath(`project-${session.id.slice(0, 8)}`);
    await initializeProject(projectPath, `project-${session.id.slice(0, 8)}`);

    // Save user message
    createMessage(session.id, "user", message);

    // Get conversation history for context
    const messages = getSessionMessages(session.id);
    const conversationHistory: ConversationMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }))
      .slice(-20); // Keep last 20 messages for context

    // Create SSE stream
    const encoder = new TextEncoder();
    let assistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamAgentResponse(
            message,
            conversationHistory.slice(0, -1), // Exclude the message we just added
            projectPath
          )) {
            if (event.type === "text" && event.content) {
              assistantContent += event.content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            } else if (event.type === "tool_use") {
              createMessage(
                session!.id,
                "tool_use",
                JSON.stringify(event.input),
                event.tool,
                JSON.stringify(event.input)
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            } else if (event.type === "tool_result") {
              createMessage(
                session!.id,
                "tool_result",
                String(event.result),
                event.tool
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            } else if (event.type === "error") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            } else if (event.type === "done") {
              // Save complete assistant message
              if (assistantContent) {
                createMessage(session!.id, "assistant", assistantContent);
              }
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "done",
                    sessionId: session!.id,
                    projectId: project?.id
                  })}\n\n`
                )
              );
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                content: error instanceof Error ? error.message : "Unknown error"
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  });
