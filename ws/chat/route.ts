/**
 * WebSocket Route: ws://localhost:3000/ws/chat
 * Real-time chat example
 */

import type { WsHandler } from "../../src/index";

// Store connected clients
const clients = new Set<any>();

export const open: WsHandler["open"] = (ws) => {
  clients.add(ws);
  console.log("Client connected to chat. Total clients:", clients.size);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "system",
      message: "Welcome to Bunbox Chat!",
      timestamp: Date.now(),
    })
  );

  // Broadcast to others
  broadcast(ws, {
    type: "system",
    message: "A new user joined the chat",
    timestamp: Date.now(),
  });
};

export const message: WsHandler["message"] = (ws, message) => {
  console.log("Received message:", message);

  try {
    const data = typeof message === "string" ? JSON.parse(message) : message;

    // Broadcast to all clients
    broadcast(null, {
      type: "message",
      data: data,
      timestamp: Date.now(),
    });
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Invalid message format",
      })
    );
  }
};

export const close: WsHandler["close"] = (ws) => {
  clients.delete(ws);
  console.log("Client disconnected. Total clients:", clients.size);

  // Broadcast to others
  broadcast(ws, {
    type: "system",
    message: "A user left the chat",
    timestamp: Date.now(),
  });
};

// Helper function to broadcast to all clients except sender
function broadcast(sender: any, data: any) {
  const message = JSON.stringify(data);

  for (const client of clients) {
    if (client !== sender) {
      client.send(message);
    }
  }
}
