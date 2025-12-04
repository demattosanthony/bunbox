/**
 * Chat Protocol Definition
 * Shared between server and client for type-safe communication
 */

import { defineProtocol } from "@ademattos/bunbox/client";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
  "user-left": { username: "" },
  typing: { isTyping: false, username: "" },
});

export type ChatProtocolType = typeof ChatProtocol;
