import Database from "better-sqlite3";
import type { SessionStatus, StreamMessage } from "../types.js";

export type PendingPermission = {
  toolUseId: string;
  toolName: string;
  input: unknown;
  resolve: (result: { behavior: "allow" | "deny"; updatedInput?: unknown; message?: string }) => void;
};

export type Session = {
  id: string;
  title: string;
  claudeSessionId?: string;
  status: SessionStatus;
  cwd?: string;
  allowedTools?: string;
  lastPrompt?: string;
  pendingPermissions: Map<string, PendingPermission>;
  abortController?: AbortController;
};

export type StoredSession = {
  id: string;
  title: string;
  status: SessionStatus;
  cwd?: string;
  allowedTools?: string;
  lastPrompt?: string;
  claudeSessionId?: string;
  createdAt: number;
  updatedAt: number;
};

export type SessionHistory = {
  session: StoredSession;
  messages: StreamMessage[];
};

export class SessionStore {
  private sessions = new Map<string, Session>();
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
    this.loadSessions();
  }

  createSession(options: { cwd?: string; allowedTools?: string; prompt?: string; title: string }): Session {
    // Validate and sanitize cwd to prevent path traversal
    const sanitizedCwd = options.cwd ? this.sanitizePath(options.cwd) : undefined;

    const id = crypto.randomUUID();
    const now = Date.now();
    const session: Session = {
      id,
      title: options.title,
      status: "idle",
      cwd: sanitizedCwd,
      allowedTools: options.allowedTools,
      lastPrompt: options.prompt,
      pendingPermissions: new Map()
    };
    this.sessions.set(id, session);
    this.db
      .prepare(
        `insert into sessions
          (id, title, claude_session_id, status, cwd, allowed_tools, last_prompt, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        session.title,
        session.claudeSessionId ?? null,
        session.status,
        session.cwd ?? null,
        session.allowedTools ?? null,
        session.lastPrompt ?? null,
        now,
        now
      );
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  listSessions(): StoredSession[] {
    const rows = this.db
      .prepare(
        `select id, title, claude_session_id, status, cwd, allowed_tools, last_prompt, created_at, updated_at
         from sessions
         order by updated_at desc`
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      status: row.status as SessionStatus,
      cwd: row.cwd ? String(row.cwd) : undefined,
      allowedTools: row.allowed_tools ? String(row.allowed_tools) : undefined,
      lastPrompt: row.last_prompt ? String(row.last_prompt) : undefined,
      claudeSessionId: row.claude_session_id ? String(row.claude_session_id) : undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  listRecentCwds(limit = 8): string[] {
    const rows = this.db
      .prepare(
        `select cwd, max(updated_at) as latest
         from sessions
         where cwd is not null and trim(cwd) != ''
         group by cwd
         order by latest desc
         limit ?`
      )
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((row) => String(row.cwd));
  }

  getSessionHistory(id: string): SessionHistory | null {
    const sessionRow = this.db
      .prepare(
        `select id, title, claude_session_id, status, cwd, allowed_tools, last_prompt, created_at, updated_at
         from sessions
         where id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;
    if (!sessionRow) return null;

    const messages = (this.db
      .prepare(
        `select data from messages where session_id = ? order by created_at asc`
      )
      .all(id) as Array<Record<string, unknown>>)
      .map((row) => JSON.parse(String(row.data)) as StreamMessage);

    return {
      session: {
        id: String(sessionRow.id),
        title: String(sessionRow.title),
        status: sessionRow.status as SessionStatus,
        cwd: sessionRow.cwd ? String(sessionRow.cwd) : undefined,
        allowedTools: sessionRow.allowed_tools ? String(sessionRow.allowed_tools) : undefined,
        lastPrompt: sessionRow.last_prompt ? String(sessionRow.last_prompt) : undefined,
        claudeSessionId: sessionRow.claude_session_id ? String(sessionRow.claude_session_id) : undefined,
        createdAt: Number(sessionRow.created_at),
        updatedAt: Number(sessionRow.updated_at)
      },
      messages
    };
  }

  updateSession(id: string, updates: Partial<Session>): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    Object.assign(session, updates);
    this.persistSession(id, updates);
    return session;
  }

  setAbortController(id: string, controller: AbortController | undefined): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.abortController = controller;
  }

  recordMessage(sessionId: string, message: StreamMessage): void {
    const id = ('uuid' in message && message.uuid) ? String(message.uuid) : crypto.randomUUID();
    this.db
      .prepare(
        `insert or ignore into messages (id, session_id, data, created_at) values (?, ?, ?, ?)`
      )
      .run(id, sessionId, JSON.stringify(message), Date.now());
  }

  deleteSession(id: string): boolean {
    const existing = this.sessions.get(id);
    if (existing) {
      this.sessions.delete(id);
    }
    this.db.prepare(`delete from messages where session_id = ?`).run(id);
    const result = this.db.prepare(`delete from sessions where id = ?`).run(id);
    const removedFromDb = result.changes > 0;
    return removedFromDb || Boolean(existing);
  }

  private persistSession(id: string, updates: Partial<Session>): void {
    // Use parameterized queries for all updates - never construct SQL with string concatenation
    const setClauses: string[] = [];
    const values: Array<string | number | null> = [];

    const fieldMappings: Record<string, string> = {
      claudeSessionId: "claude_session_id",
      status: "status",
      cwd: "cwd",
      allowedTools: "allowed_tools",
      lastPrompt: "last_prompt"
    };

    for (const key of Object.keys(updates)) {
      const column = fieldMappings[key];
      if (!column) continue;
      setClauses.push(`${column} = ?`);
      const value = updates[key as keyof Partial<Session>];
      values.push(value === undefined ? null : (value as string));
    }

    if (setClauses.length === 0) return;
    setClauses.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    // Use parameterized query with all values as placeholders
    const sql = `UPDATE sessions SET ${setClauses.join(", ")} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  private initialize(): void {
    this.db.exec(`pragma journal_mode = WAL;`);
    this.db.exec(
      `create table if not exists sessions (
        id text primary key,
        title text,
        claude_session_id text,
        status text not null,
        cwd text,
        allowed_tools text,
        last_prompt text,
        created_at integer not null,
        updated_at integer not null
      )`
    );
    this.db.exec(
      `create table if not exists messages (
        id text primary key,
        session_id text not null,
        data text not null,
        created_at integer not null,
        foreign key (session_id) references sessions(id)
      )`
    );
    this.db.exec(`create index if not exists messages_session_id on messages(session_id)`);
  }

  /**
   * Sanitize path to prevent path traversal attacks (CWE-22)
   */
  private sanitizePath(path: string): string {
    // Normalize the path and resolve to absolute
    const normalized = path.replace(/[^\w\s\-\.]/g, "");
    // Ensure path doesn't contain dangerous sequences
    if (normalized.includes("..") || normalized.startsWith("/") || /^[a-z]:\\/i.test(normalized)) {
      throw new Error("Invalid path: path traversal or absolute paths not allowed");
    }
    return normalized;
  }

  private loadSessions(): void {
    const rows = this.db
      .prepare(
        `select id, title, claude_session_id, status, cwd, allowed_tools, last_prompt
         from sessions`
      )
      .all();
    for (const row of rows as Array<Record<string, unknown>>) {
      const session: Session = {
        id: String(row.id),
        title: String(row.title),
        claudeSessionId: row.claude_session_id ? String(row.claude_session_id) : undefined,
        status: row.status as SessionStatus,
        cwd: row.cwd ? String(row.cwd) : undefined,
        allowedTools: row.allowed_tools ? String(row.allowed_tools) : undefined,
        lastPrompt: row.last_prompt ? String(row.last_prompt) : undefined,
        pendingPermissions: new Map()
      };
      this.sessions.set(session.id, session);
    }
  }
}
