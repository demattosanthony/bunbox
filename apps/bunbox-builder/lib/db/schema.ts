export const SCHEMA = `
-- Projects table for created bunbox apps
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sessions table for agent conversations
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Messages table for conversation history
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool_use', 'tool_result')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_input TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
`;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "tool_use" | "tool_result";
  content: string;
  tool_name: string | null;
  tool_input: string | null;
  created_at: string;
}
