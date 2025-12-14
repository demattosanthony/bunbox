import { route } from "@ademattos/bunbox";
import { z } from "zod";
import {
  listSessions,
  getSession,
  createSession,
  deleteSession,
  getSessionMessages
} from "@/lib/db";

export const getSessions = route.get().handle(() => {
  const sessions = listSessions();
  return { sessions };
});

export const createNewSession = route
  .post()
  .body(
    z.object({
      projectId: z.string().optional()
    })
  )
  .handle(({ body }) => {
    const session = createSession(body.projectId);
    return { session };
  });
