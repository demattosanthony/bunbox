/**
 * Sample Bunbox Worker
 *
 * Workers in Bunbox are used to run background tasks or long-running processes.
 * This example shows how to use a worker to connect to a chat socket and receive messages.
 */
import { SocketClient } from "@ademattos/bunbox/client";
import { ChatProtocol } from "./sockets/chat/protocol";

const username = "@john-doe";

export default async function worker() {
  const socketClient = new SocketClient(
    "ws://localhost:3000/sockets/chat",
    ChatProtocol,
    {
      username,
    }
  );

  socketClient.subscribe("chat-message", (message) => {
    console.log(message);

    if (message.data.username !== username) {
      socketClient.publish("chat-message", {
        text: "Hello from worker!",
        username,
      });
    }
  });

  // Return cleanup function for hot reload
  return {
    close: () => socketClient.close(),
  };
}
