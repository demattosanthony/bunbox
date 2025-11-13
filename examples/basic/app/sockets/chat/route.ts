import type {
  SocketUser,
  SocketContext,
  SocketMessage,
} from "@ademattos/bunbox";

export function onJoin(user: SocketUser, ctx: SocketContext) {
  console.log(`User ${user.data.username} (${user.id}) joined chat`);
  ctx.broadcast("user-joined", { username: user.data.username });
  console.log(`Total users in chat: ${ctx.getUsers().length}`);
}

export function onMessage(
  user: SocketUser,
  message: SocketMessage,
  ctx: SocketContext
) {
  console.log(`Message from ${user.data.username}:`, message);

  if (message.type === "chat-message") {
    ctx.broadcast("chat-message", {
      text: message.data.text,
      username: user.data.username,
    });
  } else if (message.type === "typing") {
    ctx.broadcast("typing", {
      isTyping: message.data.isTyping,
      username: user.data.username,
    });
  }
}

export function onLeave(user: SocketUser, ctx: SocketContext) {
  console.log(`User ${user.data.username} (${user.id}) left chat`);
  ctx.broadcast("user-left", { username: user.data.username });
  console.log(`Total users in chat: ${ctx.getUsers().length}`);
}

export function onAuthorize(
  req: Request,
  userData: { username: string; [key: string]: any }
): boolean {
  if (!userData.username?.trim() || userData.username.length > 20) {
    return false;
  }
  return true;
}
