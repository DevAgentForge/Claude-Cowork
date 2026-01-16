import { query, type SDKMessage, type PermissionResult, type SettingSource, type AgentDefinition, type SdkPluginConfig } from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent, PermissionMode } from "../types.js";
import type { Session } from "./session-store.js";
import { claudeCodePath, enhancedEnv } from "./util.js";
import { settingsManager } from "./settings-manager.js";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Timeout for permission requests (5 minutes)
 * Prevents indefinite waiting if user doesn't respond
 */
const PERMISSION_TIMEOUT_MS = 5 * 60 * 1000;

export type RunnerOptions = {
  prompt: string;
  session: Session;
  resumeSessionId?: string;
  onEvent: (event: ServerEvent) => void;
  onSessionUpdate?: (updates: Partial<Session>) => void;
  // SECURITY: providerEnv contains pre-decrypted env vars (including token)
  // This is set by ipc-handlers.ts in the main process - tokens never leave main
  providerEnv?: Record<string, string> | null;
};

export type RunnerHandle = {
  abort: () => void;
};

const DEFAULT_CWD = process.cwd();

/**
 * Get setting sources for loading ~/.claude/ configuration
 * This enables agents, skills, hooks, and plugins from user settings
 */
function getSettingSources(): SettingSource[] {
  return ["user", "project", "local"];
}

/**
 * Get custom agents from settings manager
 * Converts activeSkills to AgentDefinition format for SDK
 */
function getCustomAgents(): Record<string, AgentDefinition> {
  const agents: Record<string, AgentDefinition> = {};
  const skills = settingsManager.getActiveSkills();

  for (const skill of skills) {
    // Only convert skill-type entries (not slash commands)
    if (skill.type === "skill") {
      agents[skill.name] = {
        description: `Custom skill: ${skill.name}`,
        prompt: `You are executing the ${skill.name} skill. Follow the skill's instructions precisely.`,
        model: "sonnet"
      };
    }
  }

  return agents;
}

/**
 * Get local plugins from ~/.claude/plugins/ directory
 */
function getLocalPlugins(): SdkPluginConfig[] {
  const plugins: SdkPluginConfig[] = [];
  const pluginsDir = join(homedir(), ".claude", "plugins");

  if (existsSync(pluginsDir)) {
    // The SDK will scan this directory automatically when settingSources includes 'user'
    // We can add explicit plugin paths here if needed
    console.log(`[Runner] Plugins directory exists: ${pluginsDir}`);
  }

  // Get enabled plugins from settings
  const enabledPlugins = settingsManager.getEnabledPlugins();
  for (const [name, config] of enabledPlugins) {
    if (config.enabled) {
      const pluginPath = join(pluginsDir, name);
      if (existsSync(pluginPath)) {
        plugins.push({ type: "local", path: pluginPath });
        console.log(`[Runner] Adding plugin: ${name} from ${pluginPath}`);
      }
    }
  }

  return plugins;
}

/**
 * Parse comma-separated list of allowed tools into a Set
 * Returns null if no restrictions (all tools allowed)
 */
export function parseAllowedTools(allowedTools?: string): Set<string> | null {
  if (allowedTools === undefined || allowedTools === null || allowedTools.trim() === "") {
    return null;
  }
  const items = allowedTools
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean)
    .map((tool) => tool.toLowerCase());
  return new Set(items);
}

/**
 * Check if a tool is allowed based on allowedTools configuration
 * AskUserQuestion is always allowed
 */
export function isToolAllowed(toolName: string, allowedTools: Set<string> | null): boolean {
  // AskUserQuestion is always allowed
  if (toolName === "AskUserQuestion") return true;
  // If no restrictions, all tools are allowed
  if (!allowedTools) return true;
  // Check if tool is in the allowed set
  return allowedTools.has(toolName.toLowerCase());
}

type PermissionRequestContext = {
  session: Session;
  sendPermissionRequest: (toolUseId: string, toolName: string, input: unknown) => void;
  permissionMode: PermissionMode;
  allowedTools: Set<string> | null;
};

/**
 * Create a canUseTool function based on permission mode and allowed tools
 * - "free" mode: auto-approve all tools except AskUserQuestion
 * - "secure" mode: require user approval for all tools
 */
export function createCanUseTool({
  session,
  sendPermissionRequest,
  permissionMode,
  allowedTools
}: PermissionRequestContext) {
  return async (toolName: string, input: unknown, { signal }: { signal: AbortSignal }) => {
    const isAskUserQuestion = toolName === "AskUserQuestion";

    // FREE mode: auto-approve all tools except AskUserQuestion
    if (!isAskUserQuestion && permissionMode === "free") {
      // Still check allowedTools even in free mode
      if (!isToolAllowed(toolName, allowedTools)) {
        return {
          behavior: "deny",
          message: `Tool ${toolName} is not allowed by allowedTools restriction`
        } as PermissionResult;
      }
      return { behavior: "allow", updatedInput: input } as PermissionResult;
    }

    // SECURE mode: check allowedTools and require user approval
    if (!isToolAllowed(toolName, allowedTools)) {
      return {
        behavior: "deny",
        message: `Tool ${toolName} is not allowed by allowedTools restriction`
      } as PermissionResult;
    }

    // Request user permission
    const toolUseId = crypto.randomUUID();
    sendPermissionRequest(toolUseId, toolName, input);

    return new Promise<PermissionResult>((resolve) => {
      // Set timeout to prevent indefinite waiting
      const timeoutId = setTimeout(() => {
        session.pendingPermissions.delete(toolUseId);
        console.warn(`[Runner] Permission request timed out for tool ${toolName} (${toolUseId})`);
        resolve({ behavior: "deny", message: "Permission request timed out after 5 minutes" });
      }, PERMISSION_TIMEOUT_MS);

      session.pendingPermissions.set(toolUseId, {
        toolUseId,
        toolName,
        input,
        resolve: (result) => {
          clearTimeout(timeoutId);
          session.pendingPermissions.delete(toolUseId);
          resolve(result as PermissionResult);
        }
      });

      // Handle abort
      signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        session.pendingPermissions.delete(toolUseId);
        resolve({ behavior: "deny", message: "Session aborted" });
      });
    });
  };
}

export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate, providerEnv } = options;
  const abortController = new AbortController();

  // Get permission mode from session (default to "secure" for backward compatibility)
  const permissionMode: PermissionMode = session.permissionMode ?? "secure";
  const allowedTools = parseAllowedTools(session.allowedTools);

  // SECURITY: providerEnv is already prepared by ipc-handlers with decrypted token
  // Tokens are decrypted on-demand in main process and passed here as env vars
  console.log(`[Runner] providerEnv received:`, providerEnv ? {
    ANTHROPIC_MODEL: providerEnv.ANTHROPIC_MODEL,
    ANTHROPIC_BASE_URL: providerEnv.ANTHROPIC_BASE_URL,
    hasToken: !!providerEnv.ANTHROPIC_AUTH_TOKEN
  } : "null/undefined");
  const customEnv = providerEnv || {};
  console.log(`[Runner] customEnv keys:`, Object.keys(customEnv));

  const sendMessage = (message: SDKMessage) => {
    onEvent({
      type: "stream.message",
      payload: { sessionId: session.id, message }
    });
  };

  const sendPermissionRequest = (toolUseId: string, toolName: string, input: unknown) => {
    onEvent({
      type: "permission.request",
      payload: { sessionId: session.id, toolUseId, toolName, input }
    });
  };

  // Create canUseTool function based on permission configuration
  const canUseTool = createCanUseTool({
    session,
    sendPermissionRequest,
    permissionMode,
    allowedTools
  });

  // Start the query in the background
  (async () => {
    try {
      // Debug: log which model is being used
      const modelUsed = customEnv.ANTHROPIC_MODEL || enhancedEnv.ANTHROPIC_MODEL || "default (claude-sonnet-4-20250514)";
      console.log(`[Runner] Starting session with model: ${modelUsed}`);
      console.log(`[Runner] Base URL: ${customEnv.ANTHROPIC_BASE_URL || enhancedEnv.ANTHROPIC_BASE_URL || "default"}`);

      // Get settings for agents, plugins, and hooks
      const settingSources = getSettingSources();
      const customAgents = getCustomAgents();
      const plugins = getLocalPlugins();

      console.log(`[Runner] settingSources: ${settingSources.join(", ")}`);
      console.log(`[Runner] customAgents: ${Object.keys(customAgents).join(", ") || "none"}`);
      console.log(`[Runner] plugins: ${plugins.length} loaded`);

      const q = query({
        prompt,
        options: {
          cwd: session.cwd ?? DEFAULT_CWD,
          resume: resumeSessionId,
          abortController,
          // Merge enhancedEnv with custom provider env (custom overrides enhancedEnv)
          env: { ...enhancedEnv, ...customEnv },
          pathToClaudeCodeExecutable: claudeCodePath,
          includePartialMessages: true,
          // CRITICAL: Load settings from ~/.claude/ (enables agents, skills, hooks, plugins)
          settingSources,
          // Custom agents defined programmatically
          ...(Object.keys(customAgents).length > 0 ? { agents: customAgents } : {}),
          // Local plugins
          ...(plugins.length > 0 ? { plugins } : {}),
          // Only use bypass flags in "free" mode
          ...(permissionMode === "free"
            ? { permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true }
            : {}),
          canUseTool
        }
      });

      // Capture session_id from init message
      for await (const message of q) {
        // Extract session_id from system init message
        if (message.type === "system" && "subtype" in message && message.subtype === "init") {
          const sdkSessionId = message.session_id;
          if (sdkSessionId) {
            session.claudeSessionId = sdkSessionId;
            onSessionUpdate?.({ claudeSessionId: sdkSessionId });
          }
        }

        // Send message to frontend
        sendMessage(message);

        // Check for result to update session status
        if (message.type === "result") {
          const status = message.subtype === "success" ? "completed" : "error";
          onEvent({
            type: "session.status",
            payload: { sessionId: session.id, status, title: session.title }
          });
        }
      }

      // Query completed normally
      if (session.status === "running") {
        onEvent({
          type: "session.status",
          payload: { sessionId: session.id, status: "completed", title: session.title }
        });
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // Session was aborted, don't treat as error
        return;
      }
      onEvent({
        type: "session.status",
        payload: { sessionId: session.id, status: "error", title: session.title, error: String(error) }
      });
    }
  })();

  return {
    abort: () => abortController.abort()
  };
}
