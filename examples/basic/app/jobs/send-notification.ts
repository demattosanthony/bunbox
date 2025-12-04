/**
 * Example trigger-only job
 * No schedule - triggered programmatically from API routes
 */
import { defineJob } from "@ademattos/bunbox";

interface NotificationData {
  userId: string;
  message: string;
}

export default defineJob<NotificationData>({
  async run(data) {
    console.log(`[send-notification] Sending to user ${data.userId}: "${data.message}"`);

    // Simulate async work (e.g., sending email, push notification)
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`[send-notification] Notification sent successfully`);
  },
});
