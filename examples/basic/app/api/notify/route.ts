/**
 * Example API route that triggers a job
 * POST /api/notify - triggers the send-notification job
 */
import { jobs, json, error } from "@ademattos/bunbox";
import type { BunboxRequest } from "@ademattos/bunbox";

export async function POST(req: BunboxRequest) {
  const body = req.body as { userId?: string; message?: string } | null;

  if (!body?.userId || !body?.message) {
    return error("userId and message are required", 400);
  }

  // Fire and forget - doesn't block the response
  jobs.trigger("send-notification", {
    userId: body.userId,
    message: body.message,
  });

  return json({
    success: true,
    message: "Notification job triggered",
  });
}

export async function GET() {
  return json({
    usage: "POST /api/notify with { userId, message }",
    example: {
      userId: "user-123",
      message: "Hello from Bunbox jobs!",
    },
  });
}
