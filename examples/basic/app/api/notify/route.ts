/**
 * Example API route that triggers a job
 * POST /api/notify - triggers the send-notification job
 */
import { route, jobs, json, errors } from "@ademattos/bunbox";
import { z } from "zod";

const NotifySchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
});

export const triggerNotification = route
  .post()
  .body(NotifySchema)
  .handle(({ body }) => {
    // Fire and forget - doesn't block the response
    jobs.trigger("send-notification", {
      userId: body.userId,
      message: body.message,
    });

    return {
      success: true,
      message: "Notification job triggered",
    };
  });

export const getNotifyUsage = route.get().handle(() => ({
  usage: "POST /api/notify with { userId, message }",
  example: {
    userId: "user-123",
    message: "Hello from Bunbox jobs!",
  },
}));
