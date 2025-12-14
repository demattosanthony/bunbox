"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, FolderOpen, Sparkles, Terminal, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  isToolResult?: boolean;
}

const SUGGESTIONS = [
  { text: "Create a todo app", icon: FileCode },
  { text: "Build a blog with API", icon: Terminal },
  { text: "Make a real-time chat", icon: Sparkles },
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, projectId }),
      });

      if (!response.ok) throw new Error("Failed to send message");

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
                    m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { id: assistantMessageId, role: "assistant", content: assistantContent }];
              });
            } else if (data.type === "tool_use") {
              setMessages((prev) => [
                ...prev,
                {
                  id: `tool-${Date.now()}`,
                  role: "tool",
                  content: `${data.tool}`,
                  toolName: data.tool,
                  toolInput: data.input,
                },
              ]);
            } else if (data.type === "tool_result") {
              setMessages((prev) => [
                ...prev,
                {
                  id: `result-${Date.now()}`,
                  role: "tool",
                  content: typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2),
                  toolName: data.tool,
                  isToolResult: true,
                },
              ]);
              assistantMessageId = (Date.now() + 1).toString();
              assistantContent = "";
            } else if (data.type === "done") {
              if (data.sessionId) setSessionId(data.sessionId);
              if (data.projectId) setProjectId(data.projectId);
            } else if (data.type === "error") {
              setMessages((prev) => [
                ...prev,
                { id: `error-${Date.now()}`, role: "assistant", content: `Error: ${data.content}` },
              ]);
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
        },
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold text-lg">Bunbox Builder</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-2">
            <Plus className="w-4 h-4" />
            New
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <a href="/projects">
              <FolderOpen className="w-4 h-4" />
              Projects
            </a>
          </Button>
        </nav>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-foreground" />
              </div>
              <h1 className="text-3xl font-semibold mb-3 tracking-tight">
                What would you like to build?
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mb-8 leading-relaxed">
                Describe your app and I'll create it using bunbox.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => sendMessage(suggestion.text)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card hover:bg-secondary transition-colors text-sm"
                  >
                    <suggestion.icon className="w-4 h-4 text-muted-foreground" />
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="animate-fade-in-up">
                  {message.role === "tool" ? (
                    <div className="ml-11 my-3">
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
                          message.isToolResult
                            ? "bg-secondary text-muted-foreground"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        <Terminal className="w-3 h-3" />
                        {message.isToolResult ? "Result" : message.toolName}
                      </div>
                      {message.toolInput && !message.isToolResult && (
                        <pre className="mt-2 p-3 rounded-lg bg-secondary text-xs text-muted-foreground overflow-x-auto">
                          {JSON.stringify(message.toolInput, null, 2)}
                        </pre>
                      )}
                      {message.isToolResult && message.content && (
                        <pre className="mt-2 p-3 rounded-lg bg-secondary text-xs text-muted-foreground overflow-x-auto max-h-32">
                          {message.content.length > 300
                            ? message.content.slice(0, 300) + "..."
                            : message.content}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium",
                          message.role === "user"
                            ? "bg-foreground text-background"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        {message.role === "user" ? "U" : "B"}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {message.role === "user" ? "You" : "Bunbox Builder"}
                        </p>
                        <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">B</span>
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-end gap-3 p-3 rounded-2xl border border-border bg-card focus-within:border-foreground/20 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your app..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground resize-none outline-none min-h-[24px] max-h-[160px] py-1"
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="rounded-xl h-9 w-9 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Bunbox Builder can make mistakes. Review generated code before use.
          </p>
        </div>
      </div>
    </div>
  );
}
