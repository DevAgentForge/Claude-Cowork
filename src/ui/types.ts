import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
};

export type StreamMessage = SDKMessage | UserPromptMessage;

export type SessionStatus = "idle" | "running" | "completed" | "error";

export type SessionInfo = {
  id: string;
  title: string;
  status: SessionStatus;
  claudeSessionId?: string;
  cwd?: string;
  createdAt: number;
  updatedAt: number;
};

// Custom LLM Provider Configuration
export type LlmProviderConfig = {
  id: string;
  name: string;
  baseUrl: string;
  authToken: string;
  defaultModel?: string;
  models?: {
    opus?: string;
    sonnet?: string;
    haiku?: string;
  };
};

// Server -> Client events
export type ServerEvent =
  | { type: "stream.message"; payload: { sessionId: string; message: StreamMessage } }
  | { type: "stream.user_prompt"; payload: { sessionId: string; prompt: string } }
  | { type: "session.status"; payload: { sessionId: string; status: SessionStatus; title?: string; cwd?: string; error?: string } }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | { type: "session.history"; payload: { sessionId: string; status: SessionStatus; messages: StreamMessage[] } }
  | { type: "session.deleted"; payload: { sessionId: string } }
  | { type: "permission.request"; payload: { sessionId: string; toolUseId: string; toolName: string; input: unknown } }
  | { type: "runner.error"; payload: { sessionId?: string; message: string } }
  // Provider configuration events
  | { type: "provider.list"; payload: { providers: LlmProviderConfig[] } }
  | { type: "provider.saved"; payload: { provider: LlmProviderConfig } }
  | { type: "provider.deleted"; payload: { providerId: string } }
  | { type: "provider.data"; payload: { provider: LlmProviderConfig } };

// Client -> Server events
export type ClientEvent =
  | { type: "session.start"; payload: { title: string; prompt: string; cwd?: string; allowedTools?: string; providerId?: string } }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string; providerId?: string } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } }
  // Provider configuration events
  | { type: "provider.list" }
  | { type: "provider.save"; payload: { provider: LlmProviderConfig } }
  | { type: "provider.delete"; payload: { providerId: string } }
  | { type: "provider.get"; payload: { providerId: string } };
