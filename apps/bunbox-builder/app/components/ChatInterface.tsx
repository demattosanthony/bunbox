"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  isToolResult?: boolean;
}

const SUGGESTIONS = [
  "Create a todo app with an API",
  "Build a blog with posts and comments",
  "Make a chat app with WebSockets",
  "Create a simple dashboard"
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          projectId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "text") {
              assistantContent += data.content;
              setMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantMessageId);
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: assistantContent }
                      : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: assistantContent
                  }
                ];
              });
            } else if (data.type === "tool_use") {
              const toolMessageId = `tool-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: toolMessageId,
                  role: "tool",
                  content: `Using ${data.tool}`,
                  toolName: data.tool,
                  toolInput: data.input
                }
              ]);
            } else if (data.type === "tool_result") {
              const resultMessageId = `result-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: resultMessageId,
                  role: "tool",
                  content:
                    typeof data.result === "string"
                      ? data.result
                      : JSON.stringify(data.result, null, 2),
                  toolName: data.tool,
                  isToolResult: true
                }
              ]);
              // Reset for next assistant message
              assistantMessageId = (Date.now() + 1).toString();
              assistantContent = "";
            } else if (data.type === "done") {
              if (data.sessionId) setSessionId(data.sessionId);
              if (data.projectId) setProjectId(data.projectId);
            } else if (data.type === "error") {
              setMessages((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  role: "assistant",
                  content: `Error: ${data.content}`
                }
              ]);
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to send message"}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setProjectId(null);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>
          <span className="logo"></span>
          Bunbox Builder
        </h1>
        <nav className="nav-links">
          <a href="#" onClick={startNewChat}>
            New Chat
          </a>
          <a href="/projects">Projects</a>
        </nav>
      </header>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="messages-empty">
            <h2>What would you like to build?</h2>
            <p>
              Describe your app and I'll create it for you using bunbox. I can
              build pages, APIs, real-time features, and more.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  className="suggestion-chip"
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                {message.role === "tool" ? (
                  <div className="tool-use">
                    <div className="tool-use-header">
                      {message.isToolResult ? "Result from" : "Using"}{" "}
                      <span className="tool-use-name">{message.toolName}</span>
                    </div>
                    {message.toolInput && !message.isToolResult && (
                      <div className="tool-use-input">
                        {JSON.stringify(message.toolInput, null, 2)}
                      </div>
                    )}
                    {message.isToolResult && (
                      <div className="tool-use-input">
                        {message.content.length > 500
                          ? message.content.slice(0, 500) + "..."
                          : message.content}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="message-header">
                      <div className="message-avatar">
                        {message.role === "user" ? "U" : "B"}
                      </div>
                      <span className="message-role">
                        {message.role === "user" ? "You" : "Bunbox Builder"}
                      </span>
                    </div>
                    <div className="message-content">{message.content}</div>
                  </>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="loading-indicator">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the app you want to build..."
            disabled={isLoading}
            rows={1}
          />
          <button
            className="send-button"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
