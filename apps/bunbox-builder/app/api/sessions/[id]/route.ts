import { route } from "@ademattos/bunbox";
import { z } from "zod";
import { getSession, deleteSession, getSessionMessages } from "@/lib/db";

export const getSessionById = route
  .get()
  .params(z.object({ id: z.string() }))
  .handle(({ params }) => {
    const session = getSession(params.id);
    if (!session) {
      throw new Error("Session not found");
    }
    const messages = getSessionMessages(params.id);
    return { session, messages };
  });

export const deleteSessionById = route
  .delete()
  .params(z.object({ id: z.string() }))
  .handle(({ params }) => {
    deleteSession(params.id);
    return { success: true };
  });
