import { useState, useEffect, useRef } from "react";
import { useSocket } from "@ademattos/bunbox/client";
import { ChatProtocol } from "../sockets/chat/protocol";

interface Message {
  text: string;
  username: string;
  type: "sent" | "received" | "system";
  time: string;
}

function ChatRoom({ username }: { username: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { subscribe, publish, connected } = useSocket(
    "/sockets/chat",
    ChatProtocol,
    { username }
  );

  const isNotMe = (msgUsername: string) => msgUsername !== username;

  const addMessage = (
    text: string,
    username: string,
    type: Message["type"]
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        text,
        username,
        type,
        time: "",
      },
    ]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsubChat = subscribe("chat-message", (msg) => {
      if (isNotMe(msg.data.username)) {
        addMessage(msg.data.text, msg.data.username, "received");
      }
    });

    const unsubJoined = subscribe("user-joined", (msg) => {
      if (isNotMe(msg.data.username)) {
        addMessage(`${msg.data.username} joined`, "System", "system");
      }
    });

    const unsubLeft = subscribe("user-left", (msg) => {
      if (isNotMe(msg.data.username)) {
        addMessage(`${msg.data.username} left`, "System", "system");
      }
    });

    return () => {
      unsubChat();
      unsubJoined();
      unsubLeft();
    };
  }, [subscribe, username]);

  const sendMessage = () => {
    const message = inputValue.trim();
    if (message && connected) {
      publish("chat-message", { text: message, username });
      addMessage(message, username, "sent");
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>Chat</h1>
        <div className="header-right">
          <div
            className={`status-dot ${connected ? "connected" : "connecting"}`}
          />
          <a href="/" className="back-link">
            Home
          </a>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && connected && (
          <div className="chat-empty-state">
            <p>No messages yet</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.type}`}>
            {msg.type === "received" && (
              <div className="message-username">{msg.username}</div>
            )}
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={connected ? "Message..." : "Connecting..."}
          disabled={!connected}
        />
        <button
          onClick={sendMessage}
          disabled={!connected || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  const handleJoin = () => {
    if (username.trim()) setIsJoined(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJoin();
  };

  // Username entry screen
  if (!isJoined) {
    return (
      <div className="chat-page chat-join-page">
        <div className="chat-join-screen">
          <h2>Enter username to join chat room</h2>
          <div className="join-form">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Username"
              maxLength={20}
              autoFocus
            />
            <button onClick={handleJoin} disabled={!username.trim()}>
              Join
            </button>
          </div>
          <a href="/" className="back-link">
            ← Home
          </a>
        </div>
      </div>
    );
  }

  // Render chat room only after joining
  return <ChatRoom username={username} />;
}
