import { Database } from "bun:sqlite";
import { SCHEMA } from "./schema";
import type { Project, Session, Message } from "./schema";

const DB_PATH = process.env.DATABASE_PATH || "./data/bunbox-builder.db";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH, { create: true });
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec(SCHEMA);
  }
  return db;
}

function generateId(): string {
  return crypto.randomUUID();
}

// Session queries
export function createSession(projectId?: string): Session {
  const db = getDb();
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, project_id)
    VALUES (?, ?)
    RETURNING *
  `);
  return stmt.get(id, projectId || null) as Session;
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  return stmt.get(id) as Session | null;
}

export function listSessions(): Session[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC");
  return stmt.all() as Session[];
}

export function updateSessionTimestamp(id: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE sessions SET updated_at = datetime('now') WHERE id = ?
  `);
  stmt.run(id);
}

export function deleteSession(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  stmt.run(id);
}

// Message queries
export function createMessage(
  sessionId: string,
  role: Message["role"],
  content: string,
  toolName?: string,
  toolInput?: string
): Message {
  const db = getDb();
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO messages (id, session_id, role, content, tool_name, tool_input)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `);
  updateSessionTimestamp(sessionId);
  return stmt.get(id, sessionId, role, content, toolName || null, toolInput || null) as Message;
}

export function getSessionMessages(sessionId: string): Message[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC
  `);
  return stmt.all(sessionId) as Message[];
}

// Project queries
export function createProject(
  name: string,
  path: string,
  description?: string
): Project {
  const db = getDb();
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, description, path)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(id, name, description || null, path) as Project;
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
  return stmt.get(id) as Project | null;
}

export function listProjects(): Project[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC");
  return stmt.all() as Project[];
}

export function updateProject(
  id: string,
  updates: Partial<Pick<Project, "name" | "description">>
): Project | null {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }

  if (fields.length === 0) return getProject(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`
    UPDATE projects SET ${fields.join(", ")} WHERE id = ?
    RETURNING *
  `);
  return stmt.get(...values) as Project | null;
}

export function deleteProject(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM projects WHERE id = ?");
  stmt.run(id);
}

export function linkSessionToProject(sessionId: string, projectId: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE sessions SET project_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(projectId, sessionId);
}
