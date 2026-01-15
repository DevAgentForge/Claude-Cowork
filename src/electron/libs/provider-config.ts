import type { LlmProviderConfig } from "../types.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { app } from "electron";
import { randomUUID } from "crypto";

const PROVIDERS_FILE = join(app.getPath("userData"), "providers.json");

export function loadProviders(): LlmProviderConfig[] {
  try {
    if (existsSync(PROVIDERS_FILE)) {
      const raw = readFileSync(PROVIDERS_FILE, "utf8");
      const providers = JSON.parse(raw) as LlmProviderConfig[];
      return Array.isArray(providers) ? providers : [];
    }
  } catch {
    // Ignore missing or invalid providers file
  }
  return [];
}

export function saveProvider(provider: LlmProviderConfig): LlmProviderConfig {
  const providers = loadProviders();
  const existingIndex = providers.findIndex((p) => p.id === provider.id);

  const providerToSave = existingIndex >= 0
    ? { ...providers[existingIndex], ...provider }
    : { ...provider, id: provider.id || randomUUID() };

  if (existingIndex >= 0) {
    providers[existingIndex] = providerToSave;
  } else {
    providers.push(providerToSave);
  }

  writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
  return providerToSave;
}

export function deleteProvider(providerId: string): boolean {
  const providers = loadProviders();
  const filtered = providers.filter((p) => p.id !== providerId);
  if (filtered.length === providers.length) {
    return false;
  }
  writeFileSync(PROVIDERS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

export function getProvider(providerId: string): LlmProviderConfig | null {
  const providers = loadProviders();
  return providers.find((p) => p.id === providerId) || null;
}

/**
 * Get environment variables for a specific provider configuration.
 * This allows overriding the default Claude Code settings with custom provider settings.
 */
export function getProviderEnv(provider: LlmProviderConfig): Record<string, string> {
  const env: Record<string, string> = {};

  if (provider.baseUrl) {
    env.ANTHROPIC_BASE_URL = provider.baseUrl;
  }

  if (provider.authToken) {
    env.ANTHROPIC_AUTH_TOKEN = provider.authToken;
  }

  if (provider.defaultModel) {
    env.ANTHROPIC_MODEL = provider.defaultModel;
  }

  if (provider.models?.opus) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = provider.models.opus;
  }

  if (provider.models?.sonnet) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = provider.models.sonnet;
  }

  if (provider.models?.haiku) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = provider.models.haiku;
  }

  return env;
}
